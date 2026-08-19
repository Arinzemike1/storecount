import type { SVGProps } from "react";

/**
 * Minimal inline icon set (24px grid, 1.8 stroke) so the app ships zero
 * icon dependencies. Add new icons here to keep weight and style consistent.
 */
function Icon({
  children,
  filled = false,
  ...props
}: SVGProps<SVGSVGElement> & { filled?: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={20}
      height={20}
      fill={filled ? "currentColor" : "none"}
      stroke={filled ? "none" : "currentColor"}
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

type IconProps = SVGProps<SVGSVGElement>;

export const HomeIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M3 10.5 12 3l9 7.5" />
    <path d="M5 9.5V21h5v-6h4v6h5V9.5" />
  </Icon>
);

export const BoxIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M21 8.2 12 3 3 8.2v7.6L12 21l9-5.2V8.2Z" />
    <path d="m3.3 8.3 8.7 5 8.7-5" />
    <path d="M12 21v-7.7" />
  </Icon>
);

export const CartIcon = (props: IconProps) => (
  <Icon {...props}>
    <circle cx={9} cy={20} r={1.4} />
    <circle cx={17.5} cy={20} r={1.4} />
    <path d="M2.5 3.5h2.2l2.4 12h11.3l2.1-8.5H6" />
  </Icon>
);

export const ChartIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M4 20V10" />
    <path d="M10 20V4" />
    <path d="M16 20v-7" />
    <path d="M22 20H2" />
  </Icon>
);

export const GearIcon = (props: IconProps) => (
  <Icon {...props}>
    <circle cx={12} cy={12} r={3.2} />
    <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.03 1.56V21a2 2 0 1 1-4 0v-.09A1.7 1.7 0 0 0 8.9 19.4a1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.56-1.03H3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.6 8.9a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34H9a1.7 1.7 0 0 0 1.03-1.56V3a2 2 0 1 1 4 0v.09c0 .68.4 1.3 1.03 1.56a1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87V9c.26.63.88 1.03 1.56 1.03H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.56 1.03Z" />
  </Icon>
);

export const PlusIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M12 5v14M5 12h14" />
  </Icon>
);

export const MinusIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M5 12h14" />
  </Icon>
);

export const SearchIcon = (props: IconProps) => (
  <Icon {...props}>
    <circle cx={11} cy={11} r={7} />
    <path d="m20.5 20.5-4.3-4.3" />
  </Icon>
);

export const ChevronRightIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="m9 5 7 7-7 7" />
  </Icon>
);

export const ArrowLeftIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M19 12H5" />
    <path d="m11 6-6 6 6 6" />
  </Icon>
);

export const CheckIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="m4.5 12.5 5 5 10-11" />
  </Icon>
);

export const XIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M6 6l12 12M18 6 6 18" />
  </Icon>
);

export const TrashIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M4 7h16" />
    <path d="M9 7V4h6v3" />
    <path d="M6.5 7 7.5 21h9L17.5 7" />
    <path d="M10 11v6M14 11v6" />
  </Icon>
);

export const PencilIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M4 20h4L20.5 7.5a2.1 2.1 0 0 0-3-3L5 17l-1 4Z" />
    <path d="m14.5 6 3 3" />
  </Icon>
);

export const ReceiptIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M6 2.5h12V21l-2-1.4-2 1.4-2-1.4-2 1.4-2-1.4L6 21V2.5Z" />
    <path d="M9.5 7.5h5M9.5 11h5M9.5 14.5h3" />
  </Icon>
);

export const ClockIcon = (props: IconProps) => (
  <Icon {...props}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7.5V12l3 2" />
  </Icon>
);

export const AlertIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M12 3 1.8 20.2h20.4L12 3Z" />
    <path d="M12 10v4.5" />
    <path d="M12 17.6h.01" />
  </Icon>
);

export const LockIcon = (props: IconProps) => (
  <Icon {...props}>
    <rect x={5} y={11} width={14} height={10} rx={2.5} />
    <path d="M8 11V7.5a4 4 0 0 1 8 0V11" />
  </Icon>
);

export const LogoutIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <path d="m16 17 5-5-5-5" />
    <path d="M21 12H9" />
  </Icon>
);

export const UserIcon = (props: IconProps) => (
  <Icon {...props}>
    <circle cx={12} cy={8} r={4} />
    <path d="M4.5 21a7.5 7.5 0 0 1 15 0" />
  </Icon>
);

export const PhoneIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M6.6 3h3l1.5 4.5-2 1.5a12.5 12.5 0 0 0 5.9 5.9l1.5-2L21 14.4v3a2.6 2.6 0 0 1-2.8 2.6C10 19.4 4.6 14 4 5.8A2.6 2.6 0 0 1 6.6 3Z" />
  </Icon>
);

export const MailIcon = (props: IconProps) => (
  <Icon {...props}>
    <rect x={3} y={5} width={18} height={14} rx={2.5} />
    <path d="m4 7.5 8 6 8-6" />
  </Icon>
);

export const CameraIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M3 8.5A2.5 2.5 0 0 1 5.5 6H8l1.5-2.5h5L16 6h2.5A2.5 2.5 0 0 1 21 8.5v9a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 17.5v-9Z" />
    <circle cx={12} cy={13} r={3.5} />
  </Icon>
);

export const TagIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M3 3h8l10 10-8 8L3 11V3Z" />
    <circle cx={8} cy={8} r={1.4} />
  </Icon>
);

export const TrendUpIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="m3 17 6-6 4 4 8-8" />
    <path d="M15 7h6v6" />
  </Icon>
);

export const WalletIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M3 7.5A2.5 2.5 0 0 1 5.5 5h11A2.5 2.5 0 0 1 19 7.5V9" />
    <path d="M3 7.5V17a2.5 2.5 0 0 0 2.5 2.5h13A2.5 2.5 0 0 0 21 17v-5.5A2.5 2.5 0 0 0 18.5 9H3" />
    <path d="M16.5 14.2h.01" />
  </Icon>
);

export const BackspaceIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M8.5 5h11A1.5 1.5 0 0 1 21 6.5v11a1.5 1.5 0 0 1-1.5 1.5h-11L3 12l5.5-7Z" />
    <path d="m11.5 9.5 5 5M16.5 9.5l-5 5" />
  </Icon>
);

/** Store Count brand mark — rounded square with rising tally bars. */
export const TruckIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M3 7.5h10.5v9H3z" />
    <path d="M13.5 11h4l3 3v2.5h-7z" />
    <circle cx="7" cy="18" r="1.8" />
    <circle cx="17" cy="18" r="1.8" />
  </Icon>
);

export const StoreIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M4 9.5V20h16V9.5" />
    <path d="M3 5h18l-1.2 4.2a3 3 0 0 1-5.8.3 3 3 0 0 1-6 0 3 3 0 0 1-5.8-.3Z" />
    <path d="M10 20v-5h4v5" />
  </Icon>
);

export const ShareIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M12 3v12" />
    <path d="m8 7 4-4 4 4" />
    <path d="M5 13v6.5h14V13" />
  </Icon>
);

export const BellIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M18 9a6 6 0 1 0-12 0c0 5-2 6.5-2 6.5h16S18 14 18 9Z" />
    <path d="M10.5 19a1.8 1.8 0 0 0 3 0" />
  </Icon>
);

export const CopyIcon = (props: IconProps) => (
  <Icon {...props}>
    <rect x="9" y="9" width="11" height="11" rx="2.5" />
    <path d="M15 6.5A2.5 2.5 0 0 0 12.5 4H6.5A2.5 2.5 0 0 0 4 6.5v6A2.5 2.5 0 0 0 6.5 15" />
  </Icon>
);

export function Logo({ size = 56 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      aria-hidden="true"
      style={{ borderRadius: size * 0.28, boxShadow: "var(--shadow-card)" }}
    >
      <rect width={64} height={64} rx={18} fill="var(--color-primary)" />
      <rect x={14} y={34} width={8} height={16} rx={4} fill="var(--color-on-primary)" opacity={0.7} />
      <rect x={28} y={26} width={8} height={24} rx={4} fill="var(--color-on-primary)" opacity={0.85} />
      <rect x={42} y={16} width={8} height={34} rx={4} fill="var(--color-on-primary)" />
    </svg>
  );
}
