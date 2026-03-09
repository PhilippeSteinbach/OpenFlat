using Xunit;

namespace OpenFlat.Api.Tests;

public class SmokeTests
{
    [Fact]
    public void ProjectLoads()
    {
        Assert.True(true, "API test project loaded successfully");
    }
}
