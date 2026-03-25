using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;
using Microsoft.UI.Xaml.Controls.Primitives;
using Microsoft.UI.Xaml.Data;
using Microsoft.UI.Xaml.Input;
using Microsoft.UI.Xaml.Media;
using Microsoft.UI.Xaml.Navigation;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net.Http;
using System.Net.Http.Json;
using System.Runtime.InteropServices.WindowsRuntime;
using System.Text.Json;
using Windows.Foundation;
using Windows.Foundation.Collections;

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

            var handler = new HttpClientHandler();

            handler.ServerCertificateCustomValidationCallback = (message, cert, chain, errors) => true;

            HttpClient client = new HttpClient(handler);

            try
            {
                // Exemple : POST vers ton API
                var data = new { email = email, password = password };

                HttpResponseMessage response = await client.PostAsJsonAsync("https://localhost:8443/api/login", data);

                if (response.IsSuccessStatusCode)
                {
                    var result = await response.Content.ReadFromJsonAsync<LoginResponse>();

                    ResultText.Text = $"Token: {result.Token}";
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
                ResultText.Text = "Erreur 2";
                System.Diagnostics.Debug.WriteLine(ex.Message);
            }
        }
    }

    public class LoginResponse
    {
        public string Token { get; set; }
    }

    public static class SessionManager
    {
        public static string Token { get; set; }
    }
}
