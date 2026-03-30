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

            Provider[] providers =
            [
                new("Jean Dupont", "jean.dupont@artisanmail.fr", "Plomberie", "Paris", 4.8f, "Approuvé"),
                new("Sophie Martin", "sophie.martin.pro@gmail.com", "Électricité", "Lyon", 4.6f, "Approuvé"),
                new("Karim Benali", "karim.benali@outlook.fr", "Peinture", "Marseille", 4.3f, "En attente"),
                new("Camille Petit", "camille.petit.travaux@yahoo.fr", "Menuiserie", "Bordeaux", 4.7f, "Approuvé"),
                new("Nicolas Moreau", "n.moreau.renov@gmail.com", "Maçonnerie", "Toulouse", 4.1f, "En attente"),
                new("Laura Garcia", "laura.garcia.pro@orange.fr", "Carrelage", "Nice", 4.5f, "Approuvé"),
                new("Mehdi Roux", "mehdi.roux.batiment@gmail.com", "Plâtrerie", "Nantes", 3.9f, "En attente"),
                new("Élodie Bernard", "elodie.bernard.deco@laposte.net", "Décoration intérieure", "Lille", 4.9f, "Approuvé"),
                new("Thomas Faure", "thomas.faure.services@gmail.com", "Chauffage", "Strasbourg", 4.2f, "Approuvé"),
                new("Inès Mercier", "ines.mercier.artisan@outlook.com", "Vitrerie", "Montpellier", 3.8f, "En attente"),
                new("Alexandre Chevalier", "alex.chevalier.pro@gmail.com", "Couverture", "Rennes", 4.4f, "Approuvé"),
                new("Mélanie Giraud", "melanie.giraud.habitat@yahoo.com", "Isolation", "Reims", 4.0f, "Approuvé"),
                new("Youssef El Amrani", "y.elamrani.travaux@gmail.com", "Climatisation", "Le Havre", 3.6f, "Rejeté"),
                new("Pauline Blanchard", "pauline.blanchard.pro@icloud.com", "Serrurerie", "Saint-Étienne", 4.1f, "En attente"),
                new("Julien Perrot", "julien.perrot.btp@gmail.com", "Terrassement", "Toulon", 3.7f, "Rejeté"),
                new("Céline Renaud", "celine.renaud.renov@orange.fr", "Peinture", "Grenoble", 4.6f, "Approuvé"),
                new("Hugo Lemoine", "hugo.lemoine.menuiserie@gmail.com", "Menuiserie", "Dijon", 4.3f, "Approuvé"),
                new("Nadia Colin", "nadia.colin.services@outlook.fr", "Nettoyage chantier", "Angers", 4.0f, "En attente"),
                new("Baptiste Noel", "baptiste.noel.pro@gmail.com", "Électricité", "Nîmes", 4.7f, "Approuvé"),
                new("Sarah Lopez", "sarah.lopez.habitat@yahoo.fr", "Plomberie", "Villeurbanne", 4.4f, "Approuvé"),
                new("Vincent Marchand", "vincent.marchand.travaux@gmail.com", "Maçonnerie", "Clermont-Ferrand", 3.5f, "Rejeté"),
                new("Anaïs Tessier", "anais.tessier.deco@gmail.com", "Décoration intérieure", "Le Mans", 4.8f, "Approuvé"),
                new("Romain Picard", "romain.picard.bricolage@laposte.net", "Carrelage", "Aix-en-Provence", 4.2f, "En attente"),
                new("Fatou Diop", "fatou.diop.pro@outlook.com", "Isolation", "Brest", 4.5f, "Approuvé"),
                new("Damien Aubry", "damien.aubry.chauffage@gmail.com", "Chauffage", "Limoges", 3.9f, "En attente"),
                new("Manon Lefèvre", "manon.lefevre.vitrerie@yahoo.com", "Vitrerie", "Tours", 4.1f, "Approuvé"),
                new("Walid Saidi", "walid.saidi.renov@gmail.com", "Climatisation", "Amiens", 3.4f, "Rejeté"),
                new("Chloé Roy", "chloe.roy.serrurerie@orange.fr", "Serrurerie", "Annecy", 4.6f, "Approuvé"),
                new("Guillaume Barbier", "guillaume.barbier.toiture@gmail.com", "Couverture", "Perpignan", 4.0f, "En attente"),
                new("Leïla Haddad", "leila.haddad.travaux@icloud.com", "Plâtrerie", "Besançon", 4.3f, "Approuvé")
            ];

            ProvidersList.ItemsSource = providers;
        }
    }
}
