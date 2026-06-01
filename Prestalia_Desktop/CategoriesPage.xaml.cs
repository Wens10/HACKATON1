using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;
using Microsoft.UI.Xaml.Media.Imaging;
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
using System.Threading.Tasks;

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
        private Category? selectedCategory;
        private string? selectedEditCategoryIconPath;

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
            Func<Category, object> keySelector = orderBy switch
            {
                "Name" => c => c.Name,
                "ProviderCount" => c => c.ProviderCount,
                "ServiceCount" => c => c.ServiceCount,
                "CreationDate" => c => c.CreationDate,
                _ => c => c.Id
            };

            CategoriesList.ItemsSource = (order == "desc"
                ? categories.OrderByDescending(keySelector)
                : categories.OrderBy(keySelector)).ToList();
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

                    if (category != null)
                    {
                        AddAPICategory(category);
                        OrderAndFilter();
                    }
                }

                selectedCategoryIconPath = null;

                NewCategoryName.Text = "";

                PickCategoryIconTextBlock.Text = "Aucune";
                PickCategoryIconImage.Source = null;
                PickCategoryIconTextBlock.Visibility = Visibility.Visible;
                PickCategoryIconImage.Visibility = Visibility.Collapsed;

                AddCategoryInfoBar.IsOpen = false;
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

        private void EditCategoryDialog_PrimaryButtonClick(ContentDialog sender, ContentDialogButtonClickEventArgs args)
        {
            string newCategoryName = EditCategoryName.Text.Trim();

            if (string.IsNullOrEmpty(newCategoryName))
            {
                EditCategoryInfoBar.Message = "Le nom de la catégorie ne peut pas être vide.";
                EditCategoryInfoBar.IsOpen = true;

                args.Cancel = true;

            }
            else if (categories.Any(category => category.Name.Equals(newCategoryName, StringComparison.OrdinalIgnoreCase) && category != selectedCategory))
            {
                EditCategoryInfoBar.Message = "Une catégorie avec ce nom existe déjà.";
                EditCategoryInfoBar.IsOpen = true;

                args.Cancel = true;
            }
        }

        private async void PickEditCategoryIconButton_Click(object sender, Microsoft.UI.Xaml.RoutedEventArgs e)
        {
            if (sender is Button button)
                selectedEditCategoryIconPath = await PickIcon(button, PickEditCategoryIconImage, PickEditCategoryIconTextBlock);
        }

        private async void EditCategory_Click(object sender, RoutedEventArgs e)
        {
            if (sender is Button btn && btn.Tag is Category category)
            {
                selectedCategory = category;

                EditCategoryName.Text = category.Name;
                PickEditCategoryIconImage.Source = category.Icon;

                if (category.Icon != null)
                {
                    PickEditCategoryIconTextBlock.Visibility = Visibility.Collapsed;
                    PickEditCategoryIconImage.Visibility = Visibility.Visible;
                }
                else
                {
                    PickEditCategoryIconTextBlock.Visibility = Visibility.Visible;
                    PickEditCategoryIconImage.Visibility = Visibility.Collapsed;
                }

                selectedEditCategoryIconPath = category.IconPath;

                EditCategoryDialog.XamlRoot = this.XamlRoot;

                EditCategoryDialog.IsSecondaryButtonEnabled = category.ProviderCount == 0 && category.ServiceCount == 0;

                var result = await EditCategoryDialog.ShowAsync();

                if (result == ContentDialogResult.Primary)
                {
                    string newName = EditCategoryName.Text.Trim();
                    bool nameChanged = !newName.Equals(selectedCategory!.Name, StringComparison.OrdinalIgnoreCase);

                    // selectedEditCategoryIconPath pointe vers un fichier local = nouvelle icône choisie
                    bool iconChanged = selectedEditCategoryIconPath != null
                        && selectedEditCategoryIconPath != selectedCategory.IconPath;

                    if (nameChanged || iconChanged)
                    {
                        using var form = new MultipartFormDataContent();

                        if (nameChanged)
                            form.Add(new StringContent(newName), "name");

                        if (iconChanged)
                        {
                            var iconContent = new StreamContent(File.OpenRead(selectedEditCategoryIconPath!));

                            iconContent.Headers.ContentType = new MediaTypeHeaderValue("image/png");
                            form.Add(iconContent, "icon", Path.GetFileName(selectedEditCategoryIconPath!));
                        }

                        var response = await HttpClientProvider.Http.PatchAsync($"/api/categories/{selectedCategory.Id}", form);

                        if (response.IsSuccessStatusCode)
                        {
                            var updated = await response.Content.ReadFromJsonAsync<APICategory?>();

                            if (updated != null)
                            {
                                categories.Remove(selectedCategory);
                                AddAPICategory(updated);
                                OrderAndFilter();
                            }
                        }
                    }

                    selectedEditCategoryIconPath = null;
                    EditCategoryInfoBar.IsOpen = false;
                } else if (result == ContentDialogResult.Secondary)
                {
                    var confirm = new ContentDialog
                    {
                        Title = "Confirmer la suppression",
                        Content = $"Êtes-vous sûr de vouloir supprimer la catégorie \"{category.Name}\" ?",
                        PrimaryButtonText = "Supprimer",
                        CloseButtonText = "Annuler",
                        XamlRoot = this.XamlRoot
                    };

                    var confirmResult = await confirm.ShowAsync();

                    if (confirmResult == ContentDialogResult.Primary)
                    {
                        var response = await HttpClientProvider.Http.DeleteAsync($"/api/categories/{category.Id}");

                        if (response.IsSuccessStatusCode)
                        {
                            categories.Remove(category);
                            OrderAndFilter();
                        }
                    }
                }
            }
        }

        private async void PickCategoryIconButton_Click(object sender, Microsoft.UI.Xaml.RoutedEventArgs e)
        {
            if (sender is Button button)
                selectedCategoryIconPath = await PickIcon(button, PickCategoryIconImage, PickCategoryIconTextBlock);
        }

        private async Task<string?> PickIcon(Button button, Image previewImage, TextBlock placeholder)
        {
            //disable the button to avoid double-clicking
            button.IsEnabled = false;

            var picker = new FileOpenPicker(button.XamlRoot.ContentIslandEnvironment.AppWindowId);

            picker.FileTypeFilter.Add(".png");

            picker.SuggestedStartLocation = PickerLocationId.PicturesLibrary;

            picker.ViewMode = PickerViewMode.List;

            // Show the picker dialog window
            var file = await picker.PickSingleFileAsync();

            if (file != null)
            {
                previewImage.Source = new BitmapImage(new Uri(file.Path));
                placeholder.Visibility = Visibility.Collapsed;
                previewImage.Visibility = Visibility.Visible;
            }
            else
            {
                placeholder.Visibility = Visibility.Visible;
                previewImage.Visibility = Visibility.Collapsed;
            }

            //re-enable the button
            button.IsEnabled = true;

            return file?.Path;
        }
    }
}
