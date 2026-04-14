using Microsoft.UI.Windowing;
using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;
using Windows.Graphics;
using System;
using Microsoft.UI.Xaml.Navigation;

// To learn more about WinUI, the WinUI project structure,
// and more about our project templates, see: http://aka.ms/winui-project-info.

namespace Prestalia_Desktop
{
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

            AppWindow.Move(new PointInt32(
                (area.Value.Width - AppWindow.Size.Width) / 2,
                (area.Value.Height - AppWindow.Size.Height) / 2));
        }

        private void RootFrame_Navigated(object sender, NavigationEventArgs e)
        {
            UpdateNavigationState();
        }

        private void UpdateNavigationSelection(Type currentPageType)
        {
            foreach (var item in NavView.MenuItems)
            {
                if (item is NavigationViewItem navItem)
                {
                    Type? pageType = navItem.Tag?.ToString() switch
                    {
                        "Home" => typeof(HomePage),
                        "Categories" => typeof(CategoriesPage),
                        "Activities" => typeof(ActivitiesPage),
                        _ => null
                    };

                    if (pageType == currentPageType)
                    {
                        NavView.SelectedItem = navItem;
                        return;
                    }
                }
            }

            NavView.SelectedItem = null;
        }

        private void AppTitleBar_BackRequested(TitleBar sender, object args)
        {
            if (RootFrame.CanGoBack)
            {
                RootFrame.GoBack();
            }
        }

        private void AppTitleBar_PaneToggleRequested(TitleBar sender, object args)
        {
            NavView.IsPaneOpen = !NavView.IsPaneOpen;
        }

        public void UpdateNavigationState()
        {
            bool isLoginPage = RootFrame.CurrentSourcePageType == typeof(LoginPage);
            bool canGoBack = RootFrame.CanGoBack;

            AppTitleBar.Visibility = isLoginPage ? Visibility.Collapsed : Visibility.Visible;
            NavView.IsPaneVisible = !isLoginPage;

            AppTitleBar.IsBackButtonVisible = !isLoginPage && canGoBack;
            AppTitleBar.IsBackButtonEnabled = !isLoginPage && canGoBack;

            UpdateNavigationSelection(RootFrame.CurrentSourcePageType);
        }

        private void NavView_SelectionChanged(NavigationView sender, NavigationViewSelectionChangedEventArgs args)
        {
            if (args.SelectedItemContainer is NavigationViewItem selectedItem)
            {
                Type? pageType = selectedItem.Tag?.ToString() switch
                {
                    "Home" => typeof(HomePage),
                    "Categories" => typeof(CategoriesPage),
                    "Activities" => typeof(ActivitiesPage),
                    _ => null
                };

                if (pageType == null) return;

                if (RootFrame.CurrentSourcePageType != pageType)
                {
                    RootFrame.Navigate(pageType);
                }
            }
        }
    }
}