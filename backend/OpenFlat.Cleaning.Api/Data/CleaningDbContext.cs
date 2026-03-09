using Microsoft.EntityFrameworkCore;

namespace OpenFlat.Cleaning.Api.Data;

public class CleaningDbContext(DbContextOptions<CleaningDbContext> options) : DbContext(options)
{
    public DbSet<CleaningTask> Tasks => Set<CleaningTask>();
    public DbSet<CleaningComment> Comments => Set<CleaningComment>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.HasDefaultSchema("cleaning");

        modelBuilder.Entity<CleaningTask>(e =>
        {
            e.ToTable("tasks");
            e.HasKey(t => t.Id);
            e.Property(t => t.Id).HasDefaultValueSql("gen_random_uuid()");
            e.Property(t => t.Title).HasMaxLength(200).IsRequired();
            e.Property(t => t.Points).IsRequired();
            e.Property(t => t.Status)
                .HasConversion<string>()
                .HasMaxLength(20)
                .HasDefaultValue(CleaningTaskStatus.Todo);
            e.Property(t => t.SortOrder).HasDefaultValue(0);
            e.Property(t => t.CreatedAt).HasDefaultValueSql("now()");
            e.Property(t => t.UpdatedAt).HasDefaultValueSql("now()");

            e.HasIndex(t => t.Status).HasDatabaseName("ix_tasks_status");
            e.HasIndex(t => new { t.Status, t.SortOrder }).HasDatabaseName("ix_tasks_status_sort");
            e.HasIndex(t => t.AssignedUserId)
                .HasDatabaseName("ix_tasks_assigned_user_id")
                .HasFilter("assigned_user_id IS NOT NULL");
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
