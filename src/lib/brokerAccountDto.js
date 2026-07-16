export function sanitizeTradingAccount(a) {
  if (!a) return null
  const {
    alpacaSecretEnc,
    alpacaKeyId,
    tradovatePasswordEnc,
    tradovateSecEnc,
    tradovateOAuthAccessEnc,
    ...rest
  } = a
  const name = rest.tradovateName
  const oauth = !!tradovateOAuthAccessEnc
  const creds = !!(
    name &&
    tradovatePasswordEnc &&
    rest.tradovateCid != null &&
    tradovateSecEnc
  )
  return {
    ...rest,
    alpacaConnected: !!(alpacaKeyId && alpacaSecretEnc),
    alpacaKeyLast4: alpacaKeyId ? String(alpacaKeyId).slice(-4) : null,
    tradovateConnected: oauth || creds,
    tradovateOAuthConnected: oauth,
    tradovateNameLast3: name ? String(name).slice(-3) : null,
  }
}
