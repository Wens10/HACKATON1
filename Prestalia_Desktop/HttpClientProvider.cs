using Microsoft.UI.Xaml.Media.Imaging;
using System;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Threading.Tasks;
using Windows.Storage.Streams;

public static class HttpClientProvider
{
    public static readonly HttpClient Http = new(new HttpClientHandler
    {
        ServerCertificateCustomValidationCallback = HttpClientHandler.DangerousAcceptAnyServerCertificateValidator
    })
    {
        BaseAddress = new Uri("https://localhost:8443")
    };

    public static async Task<BitmapImage?> LoadImageAsync(string url)
    {
        try
        {
            var bytes = await HttpClientProvider.Http.GetByteArrayAsync(url);
            var image = new BitmapImage();

            using var stream = new InMemoryRandomAccessStream();
            using var writer = new DataWriter(stream.GetOutputStreamAt(0));

            writer.WriteBytes(bytes);
            await writer.StoreAsync();

            await image.SetSourceAsync(stream);
            return image;
        }
        catch
        {
            return null;
        }
    }

    public static void SetToken(string token)
    {
        Http.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
    }
}