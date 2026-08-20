type AppLogoProps = {
  alt?: string;
  className?: string;
};

const APP_LOGO_SRC = "/manifest-icon.png";

export default function AppLogo({
  alt = "Sales App logo",
  className = "",
}: AppLogoProps) {
  const classes = `object-contain ${className}`.trim();

  return <img src={APP_LOGO_SRC} alt={alt} className={classes} />;
}
