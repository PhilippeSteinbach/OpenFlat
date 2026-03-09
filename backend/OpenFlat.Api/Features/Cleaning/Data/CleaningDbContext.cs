using Microsoft.EntityFrameworkCore;

namespace OpenFlat.Api.Features.Cleaning.Data;

public class CleaningDbContext(DbContextOptions<CleaningDbContext> options) : DbContext(options)
{
    public DbSet<CleaningTask> Tasks => Set<CleaningTask>();
    public DbSet<CleaningComment> Comments => Set<CleaningComment>();
    public DbSet<CleaningCompletionLog> CompletionLogs => Set<CleaningCompletionLog>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.HasDefaultSchema("cleaning");

        modelBuilder.Entity<CleaningTask>(e =>
        {
            e.ToTable("tasks");
            e.HasKey(t => t.Id);
            e.Property(t => t.Id).HasDefaultValueSql("gen_random_uuid()");
            e.Property(t => t.Title).HasMaxLength(200).IsRequired();
            e.Property(t => t.Effort).HasDefaultValue(CleaningEffort.Normal).HasSentinel(CleaningEffort.Normal);
            e.Property(t => t.Points).IsRequired();
            e.Property(t => t.FrequencyValue).IsRequired();
            e.Property(t => t.FrequencyUnit).HasConversion<string>().HasMaxLength(10).IsRequired();
            e.Property(t => t.DueDate).IsRequired();
            e.Property(t => t.RotationOrder).HasDefaultValueSql("'{}'");
            e.Property(t => t.RotationIndex).HasDefaultValue(0);
            e.Property(t => t.CreatedAt).HasDefaultValueSql("now()");
            e.Property(t => t.UpdatedAt).HasDefaultValueSql("now()");

            e.HasIndex(t => t.DueDate).HasDatabaseName("ix_tasks_due_date");
            e.HasIndex(t => t.AssignedUserId)
                .HasDatabaseName("ix_tasks_assigned_user_id")
                .HasFilter("\"AssignedUserId\" IS NOT NULL");
        });

        modelBuilder.Entity<CleaningCompletionLog>(e =>
        {
            e.ToTable("completion_log");
            e.HasKey(cl => cl.Id);
            e.Property(cl => cl.Id).HasDefaultValueSql("gen_random_uuid()");
            e.Property(cl => cl.PointsEarned).IsRequired();
            e.Property(cl => cl.CompletedAt).HasDefaultValueSql("now()");

            e.HasOne(cl => cl.Task)
                .WithMany(t => t.CompletionLogs)
                .HasForeignKey(cl => cl.TaskId)
                .OnDelete(DeleteBehavior.Cascade);

            e.HasIndex(cl => cl.CompletedByUserId).HasDatabaseName("ix_completion_log_completed_by");
            e.HasIndex(cl => cl.TaskId).HasDatabaseName("ix_completion_log_task_id");
        });

        modelBuilder.Entity<CleaningComment>(e =>
        {
            e.ToTable("comments");
            e.HasKey(c => c.Id);
            e.Property(c => c.Id).HasDefaultValueSql("gen_random_uuid()");
            e.Property(c => c.Text).HasMaxLength(2000).IsRequired();
            e.Property(c => c.IsEdited).HasDefaultValue(false);
            e.Property(c => c.CreatedAt).HasDefaultValueSql("now()");
            e.Property(c => c.UpdatedAt).HasDefaultValueSql("now()");

            e.HasOne(c => c.Task)
                .WithMany(t => t.Comments)
                .HasForeignKey(c => c.TaskId)
                .OnDelete(DeleteBehavior.Cascade);

            e.HasIndex(c => c.TaskId).HasDatabaseName("ix_cleaning_comments_task_id");
            e.HasIndex(c => new { c.TaskId, c.CreatedAt }).HasDatabaseName("ix_cleaning_comments_task_created");
        });
    }
}
