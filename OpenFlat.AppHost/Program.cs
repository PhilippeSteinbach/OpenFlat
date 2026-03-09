var builder = DistributedApplication.CreateBuilder(args);

// PostgreSQL with persistent volume
var postgres = builder.AddPostgres("postgres")
    .WithDataVolume()
    .WithLifetime(ContainerLifetime.Persistent);

var db = postgres.AddDatabase("openflat");

// Migration service — runs all 3 schema migrations then stops
var migrations = builder.AddProject<Projects.OpenFlat_MigrationService>("migrations")
    .WithReference(db)
    .WaitFor(db);

// Backend APIs — wait for migrations to complete
var cleaningApi = builder.AddProject<Projects.OpenFlat_Cleaning_Api>("cleaning-api")
    .WithReference(db)
    .WaitFor(db)
    .WaitForCompletion(migrations);

var shoppingApi = builder.AddProject<Projects.OpenFlat_Shopping_Api>("shopping-api")
    .WithReference(db)
    .WaitFor(db)
    .WaitForCompletion(migrations);

var financeApi = builder.AddProject<Projects.OpenFlat_Finance_Api>("finance-api")
    .WithReference(db)
    .WaitFor(db)
    .WaitForCompletion(migrations);

// React frontend (Vite dev server)
builder.AddViteApp("frontend", "../frontend")
    .WithHttpEndpoint(name: "vite", env: "PORT")
    .WithReference(cleaningApi)
    .WithReference(shoppingApi)
    .WithReference(financeApi);

builder.Build().Run();
