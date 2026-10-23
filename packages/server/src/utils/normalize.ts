// we pass the error in normalizeErrorMessage function and it passes filters: 
// replace uuids, ip4 or ip6 + port, replace url query parameter, resource_id
import crypto from "node:crypto";

type normalizeErrorType = {
    message: string;
    code?: string;
    name: string;
}

const UUID_REGEX = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
const IP_REGEX = /\b(?:\d{1,3}\.){3}\d{1,3}(?::\d+)?\b/g;
const QUERY_REGEX = /\?[^\s"'>]+/g;
const RESOURCE_ID_REGEX = /(?<=(?:user|order|cust|account|job|inv|id)[_\-:])\w+/gi;

export function normalizeErrorMessage(message: string) {
    const sanitizedmessage = message.replace(UUID_REGEX, '[UUID]').replace(IP_REGEX, '[IP]')
        .replace(QUERY_REGEX, '?[QUERY]').replace(RESOURCE_ID_REGEX, '[ID]')
        .trim()
    return sanitizedmessage;
}

// `${name}:${code || ""}:${cleanMessage}`
export function generateErrorFingerprint({ message, code, name }: normalizeErrorType) {

    const normalizedError = normalizeErrorMessage(message);

    const errorString = `${name}:${code || ""}:${normalizedError}`;

    return crypto.createHash("sha256").update(errorString).digest("hex")

}
