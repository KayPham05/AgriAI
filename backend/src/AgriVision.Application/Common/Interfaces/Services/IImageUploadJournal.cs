namespace AgriVision.Application.Common.Interfaces.Services;

public interface IImageUploadJournal
{
    Task ReserveAsync(ImageStorageContext context, string key, CancellationToken cancellationToken);
    Task CompleteAsync(string key, CancellationToken cancellationToken);
}
