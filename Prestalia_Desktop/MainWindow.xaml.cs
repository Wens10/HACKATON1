using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;
using System;
using System.Net.Http;
using System.Net.Http.Json;

// To learn more about WinUI, the WinUI project structure,
// and more about our project templates, see: http://aka.ms/winui-project-info.

namespace Prestalia_Desktop
{
    /// <summary>
    /// An empty window that can be used on its own or navigated to within a Frame.
    /// </summary>
    public sealed partial class MainWindow : Window
    {
        public MainWindow()
        {
            InitializeComponent();
        }

        private async void LoginButton_Click(object sender, RoutedEventArgs e)
        {
            string email = EmailTextBox.Text;
            string password = PasswordBox.Password;

            HttpClientHandler handler = new()
            {
                ServerCertificateCustomValidationCallback = (message, cert, chain, errors) => true
            };

            HttpClient client = new(handler);

            try
            {
                var data = new { email, password };

                HttpResponseMessage response = await client.PostAsJsonAsync("https://localhost:8443/api/login", data);

                if (response.IsSuccessStatusCode)
                {
                    var result = await response.Content.ReadFromJsonAsync<LoginResponse>();

                    if (result != null && result.Token != null)
                    {
                        ResultText.Text = $"Token: {result.Token}";
                    }
                    else
                    {
                        ResultText.Text = "Erreur: réponse du serveur invalide";
                    }
                }
                else
                {
                    string content = await response.Content.ReadAsStringAsync();

                    ResultText.Text = $"Erreur HTTP: {(int)response.StatusCode}\n{content}";

                    System.Diagnostics.Debug.WriteLine($"Erreur HTTP: {(int)response.StatusCode}\n{content}");
                }
            }
            catch (Exception ex)
            {
                ResultText.Text = "Erreur lors de la requête pour la connexion";

                System.Diagnostics.Debug.WriteLine(ex.Message);
            }
        }
    }

    public class LoginResponse
    {
        public string? Token { get; set; }
    }

    public static class SessionManager
    {
        public static string? Token { get; set; }
    }
}
