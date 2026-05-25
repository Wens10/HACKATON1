namespace Prestalia_Desktop
{
    internal class Category(string name, int providerCount, int serviceCount, string creationDate)
    {
        public string Name { get; private set; } = name;
        public int ProviderCount { get; private set; } = providerCount;
        public int ServiceCount { get; private set; } = serviceCount;
        public string CreationDate { get; private set; } = creationDate;
    }
}
