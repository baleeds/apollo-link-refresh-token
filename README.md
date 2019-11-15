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
  if (!process.env.YOUR_GRAPHQL_ENDPOINT) {
    throw new Error(
      '.env.YOUR_GRAPHQL_ENDPOINT must be set to use refresh token link'
    );
  }
  
  try {
    const fetchResult = await fetch(process.env.YOUR_GRAPHQL_ENDPOINT, {
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
    if (
      extensions &&
      extensions.code &&
      extensions.code === 'UNAUTHENTICATED'
    ) {
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

## Options

| Option                 | Type                                                   | Default | Description                                                                                                                                             |
| ---------------------- | ------------------------------------------------------ | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| authorizationHeaderKey | string                                                 | --      | Name of the authorization header on your requests. Is used to update the headers before retrying the failed request                                     |
| fetchNewAccessToken    | (refreshToken: string) => Promise<string \| undefined> | --      | A function returning a promise to fetch and return the new refresh token string.                                                                        |
| getAccessToken         | () => string \| undefined \| null                      | --      | A function to return the current access token. Is used to ensure that the user should be logged in, and to pass into isAccessTokenValid.                |
| getRefreshToken        | () => string \| undefined \| null                      | --      | A function to return the current refreshToken. Is used to ensure that refresh is possible. It is passed to fetchNewAccessToken().                       |
| isAccessTokenValid     | (accessToken?: string) => boolean                      | --      | A function that takes the access token (from getAccessToken) and returns true if the access token is valid. If the token is valid, refresh won't occur. |
| isUnauthenticatedError | (graphQLError: GraphQLError) => boolean                | --      | A function that determines whether the error from the current operation warrants a token refresh. Usually looks for an unauthenticated code.            |
| onFailedRefresh?       | (error: any) => void                                   | --      | A function to handle errors when the refresh fails.                                                                                                     |
| onSuccessfulRefresh?   | (refreshToken: string) => void                         | --      | A function to handle successful refresh.                                                                                                                |

## Pull Requests

Fork this repo 
https://github.com/baleeds/apollo-link-refresh-token 
git checkout -b "your-feature-or-suggestion"

Create a new pull request with your feature on github.

## Why use apollo link refresh token

All the other apollo refresh token libraries are straight garbo.
This one isn't much better but at least its garbo that works!

&&
This Repo comes with free Refreshments!
