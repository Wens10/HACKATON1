using Microsoft.UI.Xaml.Controls;
using System;
using System.Collections.Generic;
using System.Linq;

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

        public HomePage()
        {
            InitializeComponent();

            providers.AddRange([
                new(1, "Jean Dupont", "jean.dupont@artisanmail.fr", "Plomberie", "Paris", 4.8f, "Approuvé"),
                new(2, "Sophie Martin", "sophie.martin.pro@gmail.com", "Électricité", "Lyon", 4.6f, "Approuvé"),
                new(3, "Karim Benali", "karim.benali@outlook.fr", "Peinture", "Marseille", 4.3f, "En attente"),
                new(4, "Camille Petit", "camille.petit.travaux@yahoo.fr", "Menuiserie", "Bordeaux", 4.7f, "Approuvé"),
                new(5, "Nicolas Moreau", "n.moreau.renov@gmail.com", "Maçonnerie", "Toulouse", 4.1f, "En attente"),
                new(6, "Laura Garcia", "laura.garcia.pro@orange.fr", "Carrelage", "Nice", 4.5f, "Approuvé"),
                new(7, "Mehdi Roux", "mehdi.roux.batiment@gmail.com", "Plâtrerie", "Nantes", 3.9f, "En attente"),
                new(8, "Élodie Bernard", "elodie.bernard.deco@laposte.net", "Décoration intérieure", "Lille", 4.9f, "Approuvé"),
                new(9, "Thomas Faure", "thomas.faure.services@gmail.com", "Chauffage", "Strasbourg", 4.2f, "Approuvé"),
                new(10, "Inès Mercier", "ines.mercier.artisan@outlook.com", "Vitrerie", "Montpellier", 3.8f, "En attente"),
                new(11, "Alexandre Chevalier", "alex.chevalier.pro@gmail.com", "Couverture", "Rennes", 4.4f, "Approuvé"),
                new(12, "Mélanie Giraud", "melanie.giraud.habitat@yahoo.com", "Isolation", "Reims", 4.0f, "Approuvé"),
                new(13, "Youssef El Amrani", "y.elamrani.travaux@gmail.com", "Climatisation", "Le Havre", 3.6f, "Rejeté"),
                new(14, "Pauline Blanchard", "pauline.blanchard.pro@icloud.com", "Serrurerie", "Saint-Étienne", 4.1f, "En attente"),
                new(15, "Julien Perrot", "julien.perrot.btp@gmail.com", "Terrassement", "Toulon", 3.7f, "Rejeté"),
                new(16, "Céline Renaud", "celine.renaud.renov@orange.fr", "Peinture", "Grenoble", 4.6f, "Approuvé"),
                new(17, "Hugo Lemoine", "hugo.lemoine.menuiserie@gmail.com", "Menuiserie", "Dijon", 4.3f, "Approuvé"),
                new(18, "Nadia Colin", "nadia.colin.services@outlook.fr", "Nettoyage chantier", "Angers", 4.0f, "En attente"),
                new(19, "Baptiste Noel", "baptiste.noel.pro@gmail.com", "Électricité", "Nîmes", 4.7f, "Approuvé"),
                new(20, "Sarah Lopez", "sarah.lopez.habitat@yahoo.fr", "Plomberie", "Villeurbanne", 4.4f, "Approuvé"),
                new(21, "Vincent Marchand", "vincent.marchand.travaux@gmail.com", "Maçonnerie", "Clermont-Ferrand", 3.5f, "Rejeté"),
                new(22, "Anaïs Tessier", "anais.tessier.deco@gmail.com", "Décoration intérieure", "Le Mans", 4.8f, "Approuvé"),
                new(23, "Romain Picard", "romain.picard.bricolage@laposte.net", "Carrelage", "Aix-en-Provence", 4.2f, "En attente"),
                new(24, "Fatou Diop", "fatou.diop.pro@outlook.com", "Isolation", "Brest", 4.5f, "Approuvé"),
                new(25, "Damien Aubry", "damien.aubry.chauffage@gmail.com", "Chauffage", "Limoges", 3.9f, "En attente"),
                new(26, "Manon Lefèvre", "manon.lefevre.vitrerie@yahoo.com", "Vitrerie", "Tours", 4.1f, "Approuvé"),
                new(27, "Walid Saidi", "walid.saidi.renov@gmail.com", "Climatisation", "Amiens", 3.4f, "Rejeté"),
                new(28, "Chloé Roy", "chloe.roy.serrurerie@orange.fr", "Serrurerie", "Annecy", 4.6f, "Approuvé"),
                new(29, "Guillaume Barbier", "guillaume.barbier.toiture@gmail.com", "Couverture", "Perpignan", 4.0f, "En attente"),
                new(30, "Leïla Haddad", "leila.haddad.travaux@icloud.com", "Plâtrerie", "Besançon", 4.3f, "Approuvé")
            ]);

            ProvidersList.ItemsSource = providers;

            AllProvidersButton.IsChecked = true;

            int pendingCount = providers.Count(provider => provider.Statut == "En attente");

            InfoBadgePendingCount.Value = Math.Min(pendingCount, 99);

            setTextCount(TextPendingCount, pendingCount);
            setTextCount(TextRejectedCount, providers.Count(provider => provider.Statut == "Rejeté"));
            setTextCount(TextApprovedCount, providers.Count(provider => provider.Statut == "Approuvé"));
            setTextCount(TextProviderCount, providers.Count);
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

        private void OrderAndFilter2()
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

            ProvidersList.ItemsSource = (orderBy == "desc"
                ? filteredProviders.OrderByDescending(keySelector)
                : filteredProviders.OrderBy(keySelector)).ToList();
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

            switch (order)
            {
                case "asc":
                    switch (orderBy)
                    {
                        case "Name":
                            ProvidersList.ItemsSource = filteredProviders.OrderBy(provider => provider.Name);
                            break;

                        case "Category":
                            ProvidersList.ItemsSource = filteredProviders.OrderBy(provider => provider.Category);
                            break;

                        case "City":
                            ProvidersList.ItemsSource = filteredProviders.OrderBy(provider => provider.City);
                            break;

                        case "Rating":
                            ProvidersList.ItemsSource = filteredProviders.OrderBy(provider => provider.Rating);
                            break;

                        case "Statut":
                            ProvidersList.ItemsSource = filteredProviders.OrderBy(provider => provider.Statut);
                            break;

                        case "default":
                            ProvidersList.ItemsSource = filteredProviders;
                            break;
                    }
                    break;

                case "desc":
                    switch (orderBy)
                    {
                        case "Name":
                            ProvidersList.ItemsSource = filteredProviders.OrderByDescending(provider => provider.Name);
                            break;

                        case "Category":
                            ProvidersList.ItemsSource = filteredProviders.OrderByDescending(provider => provider.Category);
                            break;

                        case "City":
                            ProvidersList.ItemsSource = filteredProviders.OrderByDescending(provider => provider.City);
                            break;

                        case "Rating":
                            ProvidersList.ItemsSource = filteredProviders.OrderByDescending(provider => provider.Rating);
                            break;

                        case "Statut":
                            ProvidersList.ItemsSource = filteredProviders.OrderByDescending(provider => provider.Statut);
                            break;

                        case "default":
                            ProvidersList.ItemsSource = filteredProviders.Reverse();
                            break;
                    }
                    break;
            }
        }

        private void ProvidersList_SelectionChanged(object sender, SelectionChangedEventArgs e)
        {
            ProvidersList.SelectedItem = null;
        }
    }
}
