
# Etapa 1: imagem base de execução
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS base

WORKDIR /app

EXPOSE 8080

ENV ASPNETCORE_HTTP_PORTS=8080

# Etapa 2: imagem para compilação
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build

WORKDIR /src

COPY ["ProjetoIntegrador-Petroleo.csproj", "./"]

RUN dotnet restore "ProjetoIntegrador-Petroleo.csproj"

COPY . .

RUN dotnet publish "ProjetoIntegrador-Petroleo.csproj" \
    -c Release \
    -o /app/publish \
    /p:UseAppHost=false

# Etapa 3: imagem final
FROM base AS final

WORKDIR /app

COPY --from=build /app/publish .

ENTRYPOINT ["dotnet", "ProjetoIntegrador-Petroleo.dll"]
