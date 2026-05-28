using Microsoft.UI.Xaml.Controls;
using Microsoft.Windows.Storage.Pickers;
using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.Linq;

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

        public CategoriesPage()
        {
            InitializeComponent();

            categories = [
                new("Plomberie", 2, 40, "2024-01-10"),
                new("Électricité", 2, 45, "2024-01-12"),
                new("Peinture", 2, 35, "2024-01-15"),
                new("Menuiserie", 2, 30, "2024-01-18"),
                new("Carrelage", 2, 28, "2024-01-22"),
                new("Plâtrerie", 2, 26, "2024-01-25"),
                new("Décoration intérieure", 2, 22, "2024-01-28"),
                new("Chauffage", 2, 33, "2024-02-01"),
                new("Vitrerie", 2, 20, "2024-02-03"),
                new("Couverture", 2, 27, "2024-02-05"),
                new("Isolation", 2, 24, "2024-02-08"),
                new("Climatisation", 2, 29, "2024-02-10"),
                new("Serrurerie", 2, 31, "2024-02-12"),
                new("Terrassement", 1, 18, "2024-02-15"),
                new("Nettoyage chantier", 1, 15, "2024-02-18"),
            ];

            CategoriesList.ItemsSource = categories;
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
                DateTime currentDateTime = DateTime.Now;
                string formatted = currentDateTime.ToString("yyyy-MM-dd");

                string newCategoryName = NewCategoryName.Text.Trim();

                categories.Add(new(newCategoryName, 0, 0, formatted, selectedCategoryIconPath));

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
