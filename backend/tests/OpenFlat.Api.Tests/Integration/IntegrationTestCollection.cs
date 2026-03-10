using Xunit;

namespace OpenFlat.Api.Tests.Integration;

[CollectionDefinition("Integration")]
public class IntegrationTestCollection : ICollectionFixture<ApiFactory>;
