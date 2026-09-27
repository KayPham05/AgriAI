FROM mcr.microsoft.com/dotnet/sdk:9.0-alpine AS build
WORKDIR /src
COPY . .
RUN dotnet publish src/AgriVision.API/AgriVision.API.csproj -c Release -o /publish -p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:9.0-alpine
WORKDIR /app
COPY --from=build /publish .
RUN mkdir -p /app/wwwroot/uploads/predictions && chown -R "$APP_UID:$APP_UID" /app/wwwroot
USER $APP_UID
ENV ASPNETCORE_HTTP_PORTS=8080
EXPOSE 8080
ENTRYPOINT ["dotnet", "AgriVision.API.dll"]
