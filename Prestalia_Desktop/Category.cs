using System.ComponentModel;

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

        public bool HasIcon => !string.IsNullOrWhiteSpace(IconPath);
        public string Name { get; private set; } = name;
        public int ProviderCount { get; private set; } = providerCount;
        public int ServiceCount { get; private set; } = serviceCount;
        public string CreationDate { get; private set; } = creationDate;
    }
}