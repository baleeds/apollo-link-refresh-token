import { Observable } from 'apollo-link';
import { onError } from 'apollo-link-error';
import { GraphQLError } from 'graphql';

type FetchNewAccessToken = (
  refreshToken: string
) => Promise<string | undefined>;

type IsUnauthenticatedError = (graphQLError: GraphQLError) => boolean;

type GetToken = () => string | undefined | null;

type IsAccessTokenValid = (accessToken?: string) => boolean;

type OnSuccessfulRefetch = (refreshToken?: string) => void;

type OnFailedRefresh = (error: any) => void;

interface Options {
  isUnauthenticatedError: IsUnauthenticatedError;
  getAccessToken: GetToken;
  getRefreshToken: GetToken;
  isAccessTokenValid: IsAccessTokenValid;
  fetchNewAccessToken: FetchNewAccessToken;
  authorizationHeaderKey: string;
  onSuccessfulRefresh?: OnSuccessfulRefetch;
  onFailedRefresh?: OnFailedRefresh;
}

export const getRefreshTokenLink = ({
  isUnauthenticatedError,
  getAccessToken,
  getRefreshToken,
  isAccessTokenValid,
  fetchNewAccessToken,
  authorizationHeaderKey,
  onSuccessfulRefresh,
  onFailedRefresh,
}: Options) =>
  onError(({ graphQLErrors, operation, forward }) => {
    if (graphQLErrors) {
      for (let i = 0; i < graphQLErrors.length; i += 1) {
        const graphQLError = graphQLErrors[i];

        if (isUnauthenticatedError(graphQLError)) {
          const accessToken = getAccessToken();
          const refreshToken = getRefreshToken();

          if (
            !accessToken ||
            !refreshToken ||
            isAccessTokenValid(accessToken)
          ) {
            return forward(operation);
          }

          return new Observable(observer => {
            fetchNewAccessToken(refreshToken)
              .then(newAccessToken => {
                if (!newAccessToken) {
                  throw new Error('Unable to fetch new access token');
                }

                operation.setContext(({ headers = {} }: any) => ({
                  headers: {
                    ...headers,
                    [authorizationHeaderKey]: newAccessToken || undefined,
                  },
                }));

                onSuccessfulRefresh && onSuccessfulRefresh(refreshToken);
              })
              .then(() => {
                const subscriber = {
                  next: observer.next.bind(observer),
                  error: observer.error.bind(observer),
                  complete: observer.complete.bind(observer),
                };

                forward(operation).subscribe(subscriber);
              })
              .catch(error => {
                onFailedRefresh && onFailedRefresh(error);
                observer.error(error);
              });
          });
        }
      }
    }

    return forward(operation);
  });
