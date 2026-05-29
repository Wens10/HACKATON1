using Microsoft.UI.Xaml.Media.Imaging;
using System.ComponentModel;
using System.Threading.Tasks;

namespace Prestalia_Desktop
{
    internal partial class Category(string name, int providerCount, int serviceCount, string creationDate, string? iconPath = null) : INotifyPropertyChanged
    {
        public event PropertyChangedEventHandler? PropertyChanged;

        private string? _iconPath = iconPath;
        public string? IconPath
        {
            get => _iconPath;
            set
            {
                _iconPath = value;
                PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(nameof(IconPath)));
                PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(nameof(HasIcon)));
            }
        }

        private BitmapImage? _icon;
        public BitmapImage? Icon
        {
            get => _icon;
            private set
            {
                _icon = value;
                PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(nameof(Icon)));
            }
        }

        public bool HasIcon => !string.IsNullOrWhiteSpace(IconPath);
        public string Name { get; private set; } = name;
        public int ProviderCount { get; private set; } = providerCount;
        public int ServiceCount { get; private set; } = serviceCount;
        public string CreationDate { get; private set; } = creationDate;

        public async Task LoadIconAsync()
        {
            if (IconPath is null) return;
            Icon = await HttpClientProvider.LoadImageAsync(IconPath);
        }
    }
}