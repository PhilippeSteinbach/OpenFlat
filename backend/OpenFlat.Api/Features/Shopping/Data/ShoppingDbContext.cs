using Microsoft.EntityFrameworkCore;

namespace OpenFlat.Api.Features.Shopping.Data;

public class ShoppingDbContext(DbContextOptions<ShoppingDbContext> options) : DbContext(options)
{
    public DbSet<ShoppingItem> Items => Set<ShoppingItem>();
    public DbSet<ShoppingComment> Comments => Set<ShoppingComment>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.HasDefaultSchema("shopping");

        modelBuilder.Entity<ShoppingItem>(e =>
        {
            e.ToTable("items");
            e.HasKey(i => i.Id);
            e.Property(i => i.Id).HasDefaultValueSql("gen_random_uuid()");
            e.Property(i => i.Name).HasMaxLength(200).IsRequired();
            e.Property(i => i.Quantity).IsRequired();
            e.Property(i => i.IsBought).HasDefaultValue(false);
            e.Property(i => i.CreatedAt).HasDefaultValueSql("now()");
            e.Property(i => i.UpdatedAt).HasDefaultValueSql("now()");

            e.HasIndex(i => i.IsBought).HasDatabaseName("ix_items_is_bought");
            e.HasIndex(i => i.BoughtAt)
                .HasDatabaseName("ix_items_bought_at")
                .HasFilter("\"IsBought\" = true");
        });

        modelBuilder.Entity<ShoppingComment>(e =>
        {
            e.ToTable("comments");
            e.HasKey(c => c.Id);
            e.Property(c => c.Id).HasDefaultValueSql("gen_random_uuid()");
            e.Property(c => c.Text).HasMaxLength(2000).IsRequired();
            e.Property(c => c.IsEdited).HasDefaultValue(false);
            e.Property(c => c.CreatedAt).HasDefaultValueSql("now()");
            e.Property(c => c.UpdatedAt).HasDefaultValueSql("now()");

            e.HasOne(c => c.Item)
                .WithMany(i => i.Comments)
                .HasForeignKey(c => c.ItemId)
                .OnDelete(DeleteBehavior.Cascade);

            e.HasIndex(c => c.ItemId).HasDatabaseName("ix_shopping_comments_item_id");
            e.HasIndex(c => new { c.ItemId, c.CreatedAt }).HasDatabaseName("ix_shopping_comments_item_created");
        });
    }
}
