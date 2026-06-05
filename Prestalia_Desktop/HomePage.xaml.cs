using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text.Json;
using System.Text.Json.Serialization;
using static Prestalia_Desktop.CategoriesPage;

// To learn more about WinUI, the WinUI project structure,
// and more about our project templates, see: http://aka.ms/winui-project-info.

namespace Prestalia_Desktop
{
    /// <summary>
    /// An empty page that can be used on its own or navigated to within a Frame.
    /// </summary>

    public record APIDocument(
        [property: JsonPropertyName("id")] int Id,
        [property: JsonPropertyName("name")] string Name,
        [property: JsonPropertyName("url")] string Url
    );

    public sealed partial class HomePage : Page
    {
        private List<Provider> providers = [];
        private string filter = "all";
        private string order = "asc";
        private string orderBy = "default";
        private Provider? selectedProvider;

        private List<APIDocument> currentDocs = [];
        private int currentDocIndex = 0;

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
                2.5f,
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

        private async void CheckProviderButton_Click(object sender, Microsoft.UI.Xaml.RoutedEventArgs e)
        {
            if (sender is Button btn && btn.Tag is Provider provider)
            {
                selectedProvider = provider;

                CheckProviderDialog.DataContext = provider;
                CheckProviderDialog.XamlRoot = this.XamlRoot;

                CheckProviderDialog.IsPrimaryButtonEnabled = provider.Statut == "En attente";
                CheckProviderDialog.IsSecondaryButtonEnabled = provider.Statut == "En attente";

                DocumentsPanel.Visibility = Visibility.Collapsed;
                NoDocumentsText.Visibility = Visibility.Collapsed;
                DocumentsLoadingRing.IsActive = true;

                var response = await HttpClientProvider.Http.GetAsync($"/api/providers/{provider.Id}/docs");
                var body = await response.Content.ReadAsStringAsync();
                var docs = string.IsNullOrEmpty(body) ? [] : JsonSerializer.Deserialize<List<APIDocument>>(body) ?? [];

                DocumentsLoadingRing.IsActive = false;

                if (docs.Count == 0)
                {
                    NoDocumentsText.Visibility = Visibility.Visible;
                }
                else
                {
                    currentDocs = docs;
                    currentDocIndex = 0;
                    DocumentsPanel.Visibility = Visibility.Visible;
                    ShowDocument(0);
                }

                var result = await CheckProviderDialog.ShowAsync();

                if (result == ContentDialogResult.Primary)
                {
                    var res = await HttpClientProvider.Http.PostAsync($"/api/providers/{provider.Id}/approve", null);

                    if (res.IsSuccessStatusCode)
                    {
                        if (selectedProvider != null) selectedProvider.Statut = "Approuvé";

                        OrderAndFilter();
                    }
                } else if (result == ContentDialogResult.Secondary)
                {
                    var res = await HttpClientProvider.Http.PostAsync($"/api/providers/{provider.Id}/reject", null);

                    if (res.IsSuccessStatusCode)
                    {
                        if (selectedProvider != null) selectedProvider.Statut = "Rejeté";

                        OrderAndFilter();
                    }
                }
            }
        }

        private async void ShowDocument(int index)
        {
            var doc = currentDocs[index];
            DocNameText.Text = $"{index + 1}/{currentDocs.Count} — {doc.Name}";

            await DocWebView.EnsureCoreWebView2Async();
            _ = DocWebView.CoreWebView2.CallDevToolsProtocolMethodAsync(
                "Security.setIgnoreCertificateErrors", "{\"ignore\": true}"
            );

            DocWebView.Source = new Uri(doc.Url);

            PrevDocButton.IsEnabled = index > 0;
            NextDocButton.IsEnabled = index < currentDocs.Count - 1;
        }

        private void PrevDocButton_Click(object sender, RoutedEventArgs e)
        {
            if (currentDocIndex > 0) ShowDocument(--currentDocIndex);
        }

        private void NextDocButton_Click(object sender, RoutedEventArgs e)
        {
            if (currentDocIndex < currentDocs.Count - 1) ShowDocument(++currentDocIndex);
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
