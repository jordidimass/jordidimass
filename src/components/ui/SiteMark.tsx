export default function SiteMark({
  size = 32,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 128 128"
      width={size}
      height={size}
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <path
        fill="currentColor"
        d="M128 122.674H28.697L0 104.398V5.235h99.305L128 23.511v99.163zm-91.264-8.028h73.413l-17.851-10.043.132-.206H36.736v10.249zm-23.038-10.248 14.999 8.234v-8.234H13.698zm85.607-4.861 20.656 13.094V31.539H99.305v67.998zM36.736 96.37h54.53V31.539h-54.53V96.37zm-28.697 0h20.658V29.647L8.039 16.551V96.37zm91.266-72.859h14.919l-14.919-8.949v8.949zm-65.745 0h57.706V13.262H17.851l15.841 10.043-.132.206z"
      />
    </svg>
  );
}
