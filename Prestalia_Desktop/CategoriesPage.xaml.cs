using Microsoft.UI.Xaml.Controls;
using Microsoft.Windows.Storage.Pickers;
using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.IO;
using System.Linq;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using static Prestalia_Desktop.MainWindow;

// To learn more about WinUI, the WinUI project structure,
// and more about our project templates, see: http://aka.ms/winui-project-info.

namespace Prestalia_Desktop
{
    /// <summary>
    /// An empty page that can be used on its own or navigated to within a Frame.
    /// </summary>
    public sealed partial class CategoriesPage : Page
    {
        private ObservableCollection<Category> categories = [];
        private string order = "asc";
        private string orderBy = "default";
        private string? selectedCategoryIconPath;
        
        public record APICategory(
            [property: JsonPropertyName("id")] int Id,
            [property: JsonPropertyName("name")] string Name,
            [property: JsonPropertyName("icon")] string? Icon,
            [property: JsonPropertyName("created_at")] string CreatedAt,
            [property: JsonPropertyName("provider_count")] int ProviderCount,
            [property: JsonPropertyName("reservation_count")] int ReservationCout
        );

    public CategoriesPage()
        {
            InitializeComponent();

            Loaded += async (_, _) =>
            {
                var response = await HttpClientProvider.Http.GetAsync("/api/categories");
                var body = await response.Content.ReadAsStringAsync();
                var data = String.IsNullOrEmpty(body) ? [] : JsonSerializer.Deserialize<List<APICategory>>(body) ?? [];

                foreach (var category in data) AddAPICategory(category);
            };

            CategoriesList.ItemsSource = categories;
        }

        public void AddAPICategory(APICategory category)
        {
            Category cat = new(
                category.Id,
                category.Name,
                category.ProviderCount,
                category.ReservationCout,
                DateTime.Parse(category.CreatedAt).ToString("yyyy-MM-dd"),
                category.Icon
            );

            categories.Add(cat);

            _ = cat.LoadIconAsync();
        }

        private void FilterComboBox_SelectionChanged(object sender, SelectionChangedEventArgs e)
        {
            var combobox = sender as ComboBox;
            var value = combobox?.SelectedItem.ToString();

            orderBy = value switch
            {
                "Nom" => "Name",
                "Nombre de prestataires" => "ProviderCount",
                "Nombre de prestations" => "ServiceCount",
                "Date de création" => "CreationDate",
                _ => "default",
            };

            OrderAndFilter();
        }

        private void OrderComboBox_SelectionChanged(object sender, SelectionChangedEventArgs e)
        {
            var combobox = sender as ComboBox;
            var value = combobox?.SelectedItem.ToString();

            order = value switch
            {
                "Croissant" => "asc",
                "Décroissant" => "desc",
                _ => "asc",
            };

            OrderAndFilter();
        }

        private void OrderAndFilter()
        {
            IEnumerable<Category> sorted = categories;

            switch (order)
            {
                case "asc":
                    switch (orderBy)
                    {
                        case "Name":
                            sorted = categories.OrderBy(category => category.Name);
                            break;

                        case "ProviderCount":
                            sorted = categories.OrderBy(category => category.ProviderCount);
                            break;

                        case "ServiceCount":
                            sorted = categories.OrderBy(category => category.ServiceCount);
                            break;

                        case "CreationDate":
                            sorted = categories.OrderBy(category => category.CreationDate);
                            break;

                        case "default":
                            sorted = categories;
                            break;
                    }
                    break;

                case "desc":
                    switch (orderBy)
                    {
                        case "Name":
                            sorted = categories.OrderByDescending(category => category.Name);
                            break;

                        case "ProviderCount":
                            sorted = categories.OrderByDescending(category => category.ProviderCount);
                            break;

                        case "ServiceCount":
                            sorted = categories.OrderByDescending(category => category.ServiceCount);
                            break;

                        case "CreationDate":
                            sorted = categories.OrderByDescending(category => category.CreationDate);
                            break;

                        case "default":
                            sorted = categories.Reverse<Category>();
                            break;
                    }
                    break;
            }

            CategoriesList.ItemsSource = sorted.ToList();
        }

        private async void AddCategory_Click(object sender, Microsoft.UI.Xaml.RoutedEventArgs e)
        {
            AddCategoryDialog.XamlRoot = this.XamlRoot;

            ContentDialogResult result = await AddCategoryDialog.ShowAsync();

            if (result == ContentDialogResult.Primary)
            {
                string newCategoryName = NewCategoryName.Text.Trim();

                MultipartFormDataContent form;

                if (selectedCategoryIconPath != null)
                {
                    var iconStream = File.OpenRead(selectedCategoryIconPath);
                    var iconContent = new StreamContent(iconStream);

                    iconContent.Headers.ContentType = new MediaTypeHeaderValue("image/png");

                    form = new MultipartFormDataContent
                    {
                        { new StringContent(newCategoryName), "name" },
                        { iconContent, "icon", Path.GetFileName(selectedCategoryIconPath) }
                    };
                } else form = new MultipartFormDataContent
                {
                    { new StringContent(newCategoryName), "name" }
                };

                var response = await HttpClientProvider.Http.PostAsync("/api/categories", form);

                if (response.IsSuccessStatusCode)
                {
                    var category = await response.Content.ReadFromJsonAsync<APICategory?>();

                    if (category != null) AddAPICategory(category);
                }

                selectedCategoryIconPath = null;

                NewCategoryName.Text = "";

                PickCategoryIconTextBlock.Text = "Aucune";

                AddCategoryInfoBar.IsOpen = false;

                OrderAndFilter();
            }
        }

        private void AddCategoryDialog_PrimaryButtonClick(ContentDialog sender, ContentDialogButtonClickEventArgs args)
        {
            string newCategoryName = NewCategoryName.Text.Trim();

            if (string.IsNullOrEmpty(newCategoryName))
            {
                AddCategoryInfoBar.Message = "Le nom de la catégorie ne peut pas être vide.";
                AddCategoryInfoBar.IsOpen = true;

                args.Cancel = true;

            }
            else if (categories.Any(category => category.Name.Equals(newCategoryName, StringComparison.OrdinalIgnoreCase)))
            {
                AddCategoryInfoBar.Message = "Une catégorie avec ce nom existe déjà.";
                AddCategoryInfoBar.IsOpen = true;

                args.Cancel = true;
            }
        }

        private async void PickCategoryIconButton_Click(object sender, Microsoft.UI.Xaml.RoutedEventArgs e)
        {
            if (sender is Button button)
            {
                //disable the button to avoid double-clicking
                button.IsEnabled = false;

                var picker = new FileOpenPicker(button.XamlRoot.ContentIslandEnvironment.AppWindowId);

                picker.FileTypeFilter.Add(".jpg");
                picker.FileTypeFilter.Add(".png");
                picker.FileTypeFilter.Add(".webp");

                picker.SuggestedStartLocation = PickerLocationId.PicturesLibrary;

                picker.ViewMode = PickerViewMode.List;

                // Show the picker dialog window
                var file = await picker.PickSingleFileAsync();

                if (file != null)
                {
                    selectedCategoryIconPath = file.Path;
                    PickCategoryIconTextBlock.Text = "Icône: " + file.Path;
                }
                else
                {
                    selectedCategoryIconPath = null;
                    PickCategoryIconTextBlock.Text = "Aucune";
                }

                //re-enable the button
                button.IsEnabled = true;
            }

        }
    }
}
