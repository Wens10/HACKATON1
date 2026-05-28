namespace Prestalia_Desktop
{
    internal class Provider(string name, string email, string category, string city, float rating, string statut)
    {
        public string Name { get; private set; } = name;
        public string Email { get; private set; } = email;
        public string Category { get; private set; } = category;
        public string City { get; private set; } = city;
        public float Rating { get; private set; } = rating;
        public string Statut { get; private set; } = statut;
    }
}
