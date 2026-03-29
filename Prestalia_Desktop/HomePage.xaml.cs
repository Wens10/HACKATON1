using Microsoft.UI.Xaml.Controls;

// To learn more about WinUI, the WinUI project structure,
// and more about our project templates, see: http://aka.ms/winui-project-info.

namespace Prestalia_Desktop
{
    /// <summary>
    /// An empty page that can be used on its own or navigated to within a Frame.
    /// </summary>
    public sealed partial class HomePage : Page
    {
        public HomePage()
        {
            InitializeComponent();

            Provider[] providers = [
                new("Jean Dupont", "jean.dupont@example.com", "Plomberie", "Paris", 4.8f, "Approuvé"),
                new("Lucas Petit", "lucas.petit@example.com", "Menuiserie", "Bordeaux", 4.9f, "En attente"),
                new("Lucas Petit3", "lucas.petit@example.com", "Menuiserie", "Bordeaux", 4.9f, "En attente"),
                new("Lucas Petit4", "lucas.petit@example.com", "Menuiserie", "Bordeaux", 4.9f, "En attente"),
                new("Lucas Petit5", "lucas.petit@example.com", "Menuiserie", "Bordeaux", 4.9f, "En attente"),
                new("Lucas Petit6", "lucas.petit@example.com", "Menuiserie", "Bordeaux", 4.9f, "En attente"),
                new("Lucas Petit7", "lucas.petit@example.com", "Menuiserie", "Bordeaux", 4.9f, "En attente"),
                new("Lucas Petit8", "lucas.petit@example.com", "Menuiserie", "Bordeaux", 4.9f, "En attente"),
                new("Lucas Petit9", "lucas.petit@example.com", "Menuiserie", "Bordeaux", 4.9f, "En attente"),
                new("Lucas Petit10", "lucas.petit@example.com", "Menuiserie", "Bordeaux", 4.9f, "En attente"),
                new("Lucas Petit11", "lucas.petit@example.com", "Menuiserie", "Bordeaux", 4.9f, "En attente"),
                new("Lucas Petit12", "lucas.petit@example.com", "Menuiserie", "Bordeaux", 4.9f, "En attente"),
                new("Lucas Petit13", "lucas.petit@example.com", "Menuiserie", "Bordeaux", 4.9f, "En attente"),
                new("Lucas Petit14", "lucas.petit@example.com", "Menuiserie", "Bordeaux", 4.9f, "En attente"),
                new("Lucas Petit15", "lucas.petit@example.com", "Menuiserie", "Bordeaux", 4.9f, "En attente"),
                new("Lucas Petit16", "lucas.petit@example.com", "Menuiserie", "Bordeaux", 4.9f, "En attente"),
                new("Lucas Petit17", "lucas.petit@example.com", "Menuiserie", "Bordeaux", 4.9f, "En attente"),
                new("Lucas Petit18", "lucas.petit@example.com", "Menuiserie", "Bordeaux", 4.9f, "En attente"),
                new("Lucas Petit19", "lucas.petit@example.com", "Menuiserie", "Bordeaux", 4.9f, "En attente"),
                new("Lucas Petit20", "lucas.petit@example.com", "Menuiserie", "Bordeaux", 4.9f, "En attente"),
                new("Lucas Petit21", "lucas.petit@example.com", "Menuiserie", "Bordeaux", 4.9f, "En attente"),
                new("Lucas Petit22", "lucas.petit@example.com", "Menuiserie", "Bordeaux", 4.9f, "En attente"),
                new("Lucas Petit23", "lucas.petit@example.com", "Menuiserie", "Bordeaux", 4.9f, "En attente"),
                new("Lucas Petit24", "lucas.petit@example.com", "Menuiserie", "Bordeaux", 4.9f, "En attente"),
                new("Lucas Petit25", "lucas.petit@example.com", "Menuiserie", "Bordeaux", 4.9f, "En attente"),
                new("Lucas Petit26", "lucas.petit@example.com", "Menuiserie", "Bordeaux", 4.9f, "En attente"),
                new("Lucas Petit27", "lucas.petit@example.com", "Menuiserie", "Bordeaux", 4.9f, "En attente"),
                new("Lucas Petit28", "lucas.petit@example.com", "Menuiserie", "Bordeaux", 4.9f, "En attente"),
                new("Lucas Petit29", "lucas.petit@example.com", "Menuiserie", "Bordeaux", 4.9f, "En attente"),
                new("Lucas Petit30", "lucas.petit@example.com", "Menuiserie", "Bordeaux", 4.9f, "En attente"),
            ];

            ProvidersList.ItemsSource = providers;
        }
    }
}
