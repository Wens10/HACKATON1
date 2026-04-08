using Microsoft.UI;
using Microsoft.UI.Windowing;
using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;
using Windows.Graphics;

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

            this.ExtendsContentIntoTitleBar = true;
            this.SetTitleBar(AppTitleBar);

            CenterWindow();

            RootFrame.Navigate(typeof(LoginPage));

            SessionManager.Token = null;
        }

        public class LoginResponse
        {
            public string? Token { get; set; }
        }

        public static class SessionManager
        {
            public static string? Token { get; set; }
        }

        private void CenterWindow()
        {
            RectInt32? area = DisplayArea.GetFromWindowId(AppWindow.Id, DisplayAreaFallback.Nearest)?.WorkArea;

            if (area == null) return;

            AppWindow.Move(new PointInt32((area.Value.Width - AppWindow.Size.Width) / 2, (area.Value.Height - AppWindow.Size.Height) / 2));
        }
        
        private void RootFrame_Navigated(object sender, Microsoft.UI.Xaml.Navigation.NavigationEventArgs e)
        {
            bool isLoginPage = e.SourcePageType == typeof(LoginPage);

            AppTitleBar.IsBackButtonEnabled = RootFrame.CanGoBack;
            AppTitleBar.Visibility = isLoginPage ? Visibility.Collapsed : Visibility.Visible;
            NavView.IsPaneVisible = !isLoginPage;
        }

        private void AppTitleBar_BackRequested(TitleBar sender, object args)
        {
            if (RootFrame.CanGoBack) RootFrame.GoBack();
        }

        private void AppTitleBar_PaneToggleRequested(TitleBar sender, object args)
        {
            NavView.IsPaneOpen = !NavView.IsPaneOpen;
        }
    }
}
