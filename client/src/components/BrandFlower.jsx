/** La flor original elegida para la identidad visual MySpa2. */
export default function BrandFlower({ className = '', size = 28, ...props }) {
  return <img className={`myspa-flower ${className}`.trim()} src="/brand-flower.svg"
    width={size} height={size} alt="" aria-hidden="true" {...props} />;
}
