using Xunit;

namespace OpenFlat.Integration.Tests;

public class SmokeTests
{
    [Fact]
    public void ProjectLoads()
    {
        Assert.True(true, "Integration test project loaded successfully");
    }
}
