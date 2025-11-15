import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      backgroundSize: {
        'size-200': '200% 200%',
      },
      backgroundPosition: {
        'pos-0': '0% 0%',
        'pos-100': '100% 100%',
      },
      /* Premium Shadows */
      boxShadow: {
        'premium': 'var(--shadow-xl)',
        'card': 'var(--shadow-card)',
        'primary': 'var(--shadow-primary)',
      },
      /* ========================================
         DESIGN SYSTEM FOUNDATION - ETAPA 3
         ======================================== */
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
        /* Premium tokens - Success/Info/Warning */
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        info: {
          DEFAULT: "hsl(var(--info))",
          foreground: "hsl(var(--info-foreground))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
        },
      },
      /* Premium Spacing System */
      spacing: {
        'xs': 'var(--spacing-xs)',
        'sm': 'var(--spacing-sm)',
        'md': 'var(--spacing-md)',
        'lg': 'var(--spacing-lg)',
        'xl': 'var(--spacing-xl)',
        '2xl': 'var(--spacing-2xl)',
        '3xl': 'var(--spacing-3xl)',
      },
      /* Premium Typography System */
      fontSize: {
        'xs': ['var(--font-size-xs)', { lineHeight: 'var(--leading-normal)' }],
        'sm': ['var(--font-size-sm)', { lineHeight: 'var(--leading-normal)' }],
        'base': ['var(--font-size-base)', { lineHeight: 'var(--leading-normal)' }],
        'lg': ['var(--font-size-lg)', { lineHeight: 'var(--leading-normal)' }],
        'xl': ['var(--font-size-xl)', { lineHeight: 'var(--leading-tight)' }],
        '2xl': ['var(--font-size-2xl)', { lineHeight: 'var(--leading-tight)' }],
        '3xl': ['var(--font-size-3xl)', { lineHeight: 'var(--leading-tight)' }],
        '4xl': ['var(--font-size-4xl)', { lineHeight: 'var(--leading-tight)' }],
        /* Premium hierarchy tokens */
        'display': ['var(--font-size-4xl)', { lineHeight: 'var(--leading-tight)', fontWeight: 'var(--font-weight-bold)' }],
        'h1': ['var(--font-size-3xl)', { lineHeight: 'var(--leading-tight)', fontWeight: 'var(--font-weight-semibold)' }],
        'h2': ['var(--font-size-2xl)', { lineHeight: 'var(--leading-tight)', fontWeight: 'var(--font-weight-semibold)' }],
        'h3': ['var(--font-size-xl)', { lineHeight: 'var(--leading-normal)', fontWeight: 'var(--font-weight-medium)' }],
        'body-lg': ['var(--font-size-lg)', { lineHeight: 'var(--leading-relaxed)' }],
        'body': ['var(--font-size-base)', { lineHeight: 'var(--leading-normal)' }],
        'body-sm': ['var(--font-size-sm)', { lineHeight: 'var(--leading-normal)' }],
        'caption': ['var(--font-size-xs)', { lineHeight: 'var(--leading-normal)' }],
      },
      /* Premium Shadow System */
      boxShadow: {
        'xs': 'var(--shadow-xs)',
        'sm': 'var(--shadow-sm)',
        'md': 'var(--shadow-md)',
        'lg': 'var(--shadow-lg)',
        'xl': 'var(--shadow-xl)',
        '2xl': 'var(--shadow-2xl)',
        'primary': 'var(--shadow-primary)',
        'card': 'var(--shadow-card)',
      },
      /* Premium Border Radius System */
      borderRadius: {
        'xs': 'var(--radius-xs)',
        'sm': 'var(--radius-sm)',
        'md': 'var(--radius-md)',
        'lg': 'var(--radius-lg)',
        'xl': 'var(--radius-xl)',
        '2xl': 'var(--radius-2xl)',
        'full': 'var(--radius-full)',
      },
      keyframes: {
        "accordion-down": {
          from: {
            height: "0",
          },
          to: {
            height: "var(--radix-accordion-content-height)",
          },
        },
        "accordion-up": {
          from: {
            height: "var(--radix-accordion-content-height)",
          },
          to: {
            height: "0",
          },
        },
        "fade-in": {
          from: {
            opacity: "0",
            transform: "translateY(10px)",
          },
          to: {
            opacity: "1",
            transform: "translateY(0)",
          },
        },
        "scale-in": {
          from: {
            transform: "scale(0.95)",
            opacity: "0",
          },
          to: {
            transform: "scale(1)",
            opacity: "1",
          },
        },
        "slide-in-from-right": {
          from: {
            transform: "translateX(100%)",
          },
          to: {
            transform: "translateX(0)",
          },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.3s ease-out",
        "scale-in": "scale-in 0.2s ease-out",
        "slide-in-from-right": "slide-in-from-right 0.3s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
