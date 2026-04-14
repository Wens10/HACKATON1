using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;
using Microsoft.UI.Xaml.Media.Animation;
using System;
using System.Net.Http;
using System.Net.Http.Json;
using static Prestalia_Desktop.MainWindow;

// To learn more about WinUI, the WinUI project structure,
// and more about our project templates, see: http://aka.ms/winui-project-info.

namespace Prestalia_Desktop
{
    /// <summary>
    /// An empty page that can be used on its own or navigated to within a Frame.
    /// </summary>
    public sealed partial class LoginPage : Page
    {
        public LoginPage()
        {
            InitializeComponent();
        }

        private void ShadowRect_Loaded(object sender, RoutedEventArgs e)
        {
            shadow.Receivers.Add(ShadowCastGrid);
        }

        private async void LoginButton_Click(object sender, RoutedEventArgs e)
        {
            ProgressBar.Visibility = Visibility.Visible;

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
                        SessionManager.Token = result.Token;

                        ProgressBar.Visibility = Visibility.Visible;

                        Frame.Navigate(typeof(HomePage), null, new SuppressNavigationTransitionInfo());
                        Frame.BackStack.Clear();

                        App.MainWindow?.UpdateNavigationState();
                    }
                    else
                    {
                        ErrorInfoBar.IsOpen = true;
                        ErrorInfoBar.Message = "Vos identifiants sont invalides";
                    }
                }
                else
                {
                    string content = await response.Content.ReadAsStringAsync();

                    ErrorInfoBar.IsOpen = true;
                    ErrorInfoBar.Message = "Erreur lors de la demande de connexion au serveur";

                    System.Diagnostics.Debug.WriteLine($"Erreur HTTP: {(int)response.StatusCode}\n{content}");
                }
            }
            catch (Exception ex)
            {
                ErrorInfoBar.IsOpen = true;
                ErrorInfoBar.Message = "Erreur lors de la tentative de connexion, veuillez réessayer";

                System.Diagnostics.Debug.WriteLine(ex.Message);
            }

            ProgressBar.Visibility = Visibility.Collapsed;
        }
    }
}
