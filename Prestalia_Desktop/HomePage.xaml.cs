using Microsoft.UI.Xaml.Controls;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Text.Json.Serialization;

// To learn more about WinUI, the WinUI project structure,
// and more about our project templates, see: http://aka.ms/winui-project-info.

namespace Prestalia_Desktop
{
    /// <summary>
    /// An empty page that can be used on its own or navigated to within a Frame.
    /// </summary>
    public sealed partial class HomePage : Page
    {
        private List<Provider> providers = [];
        private string filter = "all";
        private string order = "asc";
        private string orderBy = "default";

        public record APIProvider(
            [property: JsonPropertyName("id")] int Id,
            [property: JsonPropertyName("created_at")] string CreatedAt,
            [property: JsonPropertyName("valided")] bool? Valided,
            [property: JsonPropertyName("tel")] string Tel,
            [property: JsonPropertyName("city")] string City,
            [property: JsonPropertyName("descr")] string Descr,
            [property: JsonPropertyName("exp")] int Exp,
            [property: JsonPropertyName("price")] int Price,
            [property: JsonPropertyName("days")] int Days,
            [property: JsonPropertyName("category_name")] string CategoryName,
            [property: JsonPropertyName("name")] string Name,
            [property: JsonPropertyName("email")] string Email
        );

        public HomePage()
        {
            InitializeComponent();

            Loaded += async (_, _) =>
            {
                var response = await HttpClientProvider.Http.GetAsync("/api/providers");
                var body = await response.Content.ReadAsStringAsync();
                var data = String.IsNullOrEmpty(body) ? [] : JsonSerializer.Deserialize<List<APIProvider>>(body) ?? [];

                foreach (var provider in data) AddAPIProvider(provider);

                ProvidersList.ItemsSource = providers;

                AllProvidersButton.IsChecked = true;

                int pendingCount = providers.Count(provider => provider.Statut == "En attente");

                InfoBadgePendingCount.Value = Math.Min(pendingCount, 99);

                setTextCount(TextPendingCount, pendingCount);
                setTextCount(TextRejectedCount, providers.Count(provider => provider.Statut == "Rejeté"));
                setTextCount(TextApprovedCount, providers.Count(provider => provider.Statut == "Approuvé"));
                setTextCount(TextProviderCount, providers.Count);
            };
        }

        public void AddAPIProvider(APIProvider provider)
        {
            String statut = provider.Valided == null ? "En attente" : provider.Valided == true ? "Approuvé" : "Rejeté";

            Provider newProvider = new(
                provider.Id,
                provider.Name,
                provider.Email,
                provider.CategoryName,
                provider.City,
                0,
                statut
            );

            providers.Add(newProvider);
        }

        private void setTextCount(TextBlock textBlock, int count)
        {
            if (count > 999_999_999) textBlock.Text = (count / 1e9).ToString("F2") + "M";
            else textBlock.Text = count.ToString(); 
        }

        private void AllProvidersButton_Checked(object sender, Microsoft.UI.Xaml.RoutedEventArgs e)
        {
            filter = "all";

            OrderAndFilter();
        }

        private void PendingProvidersButton_Checked(object sender, Microsoft.UI.Xaml.RoutedEventArgs e)
        {
            filter = "pending";

            OrderAndFilter();
        }

        private void ApprovedProvidersButton_Checked(object sender, Microsoft.UI.Xaml.RoutedEventArgs e)
        {
            filter = "approved";

            OrderAndFilter();
        }

        private void RejectedProvidersButton_Checked(object sender, Microsoft.UI.Xaml.RoutedEventArgs e)
        {
            filter = "rejected";

            OrderAndFilter();
        }

        private void CardsScrollViewer_SizeChanged(object sender, Microsoft.UI.Xaml.SizeChangedEventArgs e)
        {
            CardsGrid.Width = Math.Max(e.NewSize.Width, 728);
        }

        private void FilterComboBox_SelectionChanged(object sender, SelectionChangedEventArgs e)
        {
            var combobox = sender as ComboBox;
            var value = combobox?.SelectedItem.ToString();

            orderBy = value switch
            {
                "Nom" => "Name",
                "Catégorie" => "Category",
                "Ville" => "City",
                "Note" => "Rating",
                "Statut" => "Statut",
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
            string convertedFilter = filter switch
            {
                "pending" => "En attente",
                "approved" => "Approuvé",
                "rejected" => "Rejeté",
                _ => "all",
            };

            var filteredProviders = providers.Where(provider => convertedFilter == "all" || provider.Statut == convertedFilter);

            Func<Provider, object> keySelector = orderBy switch
            {
                "Name" => c => c.Name,
                "Category" => c => c.Category,
                "City" => c => c.City,
                "Rating" => c => c.Rating,
                "Statut" => c => c.Statut,
                _ => c => c.Id
            };

            ProvidersList.ItemsSource = (order == "desc"
                ? filteredProviders.OrderByDescending(keySelector)
                : filteredProviders.OrderBy(keySelector)).ToList();
        }
    }
}
