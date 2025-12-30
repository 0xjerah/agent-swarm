import { ApolloClient, InMemoryCache, HttpLink } from '@apollo/client';

const httpLink = new HttpLink({
  uri: process.env.NEXT_PUBLIC_GRAPHQL_URL || 'http://localhost:8080/v1/graphql',
});

export const apolloClient = new ApolloClient({
  link: httpLink,
  cache: new InMemoryCache({
    typePolicies: {
      Query: {
        fields: {
          DCASchedule: {
            // Merge incoming data properly to avoid full re-renders
            merge(existing = [], incoming) {
              return incoming;
            },
          },
          User: {
            merge(existing = [], incoming) {
              return incoming;
            },
          },
        },
      },
    },
  }),
  defaultOptions: {
    watchQuery: {
      fetchPolicy: 'cache-first', // Use cache first, reduces unnecessary network requests
      nextFetchPolicy: 'cache-first',
    },
    query: {
      fetchPolicy: 'network-only', // Manual queries always fetch fresh data
    },
  },
});
