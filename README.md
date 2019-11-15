# apollo-link-refresh-token

A link to refresh auth tokens on authentication errors

## Getting started

Install the package:

```
yarn add apollo-link-refresh-token
```

Add the link to your apollo client:

_Note that your implementation will likely change based on your specific parameters._

```typescript
import { ApolloClient } from 'apollo-client';
import {
  getTokenRefreshLink,
  FetchNewAccessToken,
} from 'apollo-link-refresh-token';
import jwtDecode from 'jwt-decode';
import { authLink, errorLink, httpLink } from './links';

const isTokenValid = (token: string): boolean => {
  const decodedToken = jwtDecode<{ [key: string]: number }>(token);

  if (!decodedToken) {
    return false;
  }

  const now = new Date();
  return now.getTime() < decodedToken.exp * 1000;
};

const fetchNewAccessToken: FetchNewAccessToken = async refreshToken => {
  if (!process.env.REACT_APP_API_URL) {
    throw new Error(
      '.env.REACT_APP_API_URL must be set to use refresh token link'
    );
  }

  try {
    const fetchResult = await fetch(process.env.REACT_APP_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `
          mutation {
            refreshTokens(input: {
              refreshToken: "${refreshToken}"
            }) {
              accessToken
              refreshToken
              errors {
                field
                message
              }
            }
          }
        `,
      }),
    });

    const refreshResponse = await fetchResult.json();

    if (
      !refreshResponse ||
      !refreshResponse.data ||
      !refreshResponse.data.refreshTokens ||
      !refreshResponse.data.refreshTokens.accessToken
    ) {
      return undefined;
    }

    return refreshResponse.data.refreshTokens.accessToken;
  } catch (e) {
    throw new Error('Failed to fetch fresh access token');
  }
};

const refreshTokenLink = getRefreshTokenLink({
  authorizationHeaderKey: 'Authorization',
  fetchNewAccessToken,
  getAccessToken: () => localStorage.getItem('access_token'),
  getRefreshToken: () => localStorage.getItem('refresh_token'),
  isAccessTokenValid: accessToken => isTokenValid(accessToken),
  isUnauthenticatedError: graphQLError => {
    const { extensions } = graphQLError;
    if (extensions && extensions.code && extensions.code === 'UNAUTHORIZED') {
      return true;
    }
    return false;
  },
});

export const client = new ApolloClient({
  link: ApolloLink.from([authLink, refreshTokenLink, errorLink, httpLink]),
  cache,
});
```
