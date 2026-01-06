

/**
 * Use to activate a needle engine license
 */
export type License = {
    /** this is the email you bought the license with 
     * @deprecated using the access token now
    */
    id?: string,
    /** this is one of the invoice IDs for an active subscription 
     * @deprecated using the access token now
    */
    key?: string,

    /**
     * Team ID
     */
    team?: string,

    /**
     * Pass in an access token to activate a license or use the NEEDLE_CLOUD_TOKEN environment variable
     */
    accessToken?: string,
}