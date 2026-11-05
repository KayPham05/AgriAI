namespace AgriVision.Domain.Enums;

public static class PlantCategory
{
    public const string Food = "Cây lương thực";
    public const string Industrial = "Cây công nghiệp";
    public const string Fruit = "Cây ăn trái";
    public const string Other = "Khác";

    public static bool IsValid(string value) => value is Food or Industrial or Fruit or Other;
}
