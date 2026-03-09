var builder = DistributedApplication.CreateBuilder(args);

// PostgreSQL with persistent volume — pinned password avoids mismatch on restart
var pgPassword = builder.AddParameter("pg-password", secret: true);
var postgres = builder.AddPostgres("postgres", password: pgPassword)
    .WithDataVolume()
    .WithLifetime(ContainerLifetime.Persistent);

var db = postgres.AddDatabase("openflat");

// Migration service — runs all 3 schema migrations then stops
var migrations = builder.AddProject<Projects.OpenFlat_MigrationService>("migrations")
    .WithReference(db)
    .WaitFor(db);

// Backend API — wait for migrations to complete
var api = builder.AddProject<Projects.OpenFlat_Api>("api")
    .WithReference(db)
    .WaitFor(db)
    .WaitForCompletion(migrations);

// React frontend (Vite dev server)
builder.AddViteApp("frontend", "../frontend")
    .WithHttpEndpoint(name: "vite", env: "PORT")
    .WithReference(api);

builder.Build().Run();
