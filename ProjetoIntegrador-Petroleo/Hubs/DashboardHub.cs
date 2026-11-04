using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace ProjetoIntegrador_Petroleo.Hubs;

[Authorize]
public class DashboardHub : Hub { }