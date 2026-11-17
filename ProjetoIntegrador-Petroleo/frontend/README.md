# PetroSync frontend bundle

The MVC application serves the compiled React dashboard, Vue alert filters, and Three.js background from `wwwroot/dist`.

When changing frontend source files, rebuild the static bundle with Node.js 20.19 or newer:

```powershell
npm ci
npm run build
```

The generated files are kept under `wwwroot/dist` so the ASP.NET Core project can run without a separate frontend development server.
