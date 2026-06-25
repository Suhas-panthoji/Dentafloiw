/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: ["class"],
    content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html"
  ],
  theme: {
  	extend: {
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		},
  		colors: {
  			background: 'hsl(var(--sh-background))',
  			foreground: 'hsl(var(--sh-foreground))',
  			card: {
  				DEFAULT: 'hsl(var(--sh-card))',
  				foreground: 'hsl(var(--sh-card-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--sh-popover))',
  				foreground: 'hsl(var(--sh-popover-foreground))'
  			},
  			primary: {
  				DEFAULT: 'hsl(var(--sh-primary))',
  				foreground: 'hsl(var(--sh-primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--sh-secondary))',
  				foreground: 'hsl(var(--sh-secondary-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--sh-muted))',
  				foreground: 'hsl(var(--sh-muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--sh-accent))',
  				foreground: 'hsl(var(--sh-accent-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--sh-destructive))',
  				foreground: 'hsl(var(--sh-destructive-foreground))'
  			},
  			border: 'hsl(var(--sh-border))',
  			input: 'hsl(var(--sh-input))',
  			ring: 'hsl(var(--sh-ring))',
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			}
  		},
  		keyframes: {
  			'accordion-down': {
  				from: {
  					height: '0'
  				},
  				to: {
  					height: 'var(--radix-accordion-content-height)'
  				}
  			},
  			'accordion-up': {
  				from: {
  					height: 'var(--radix-accordion-content-height)'
  				},
  				to: {
  					height: '0'
  				}
  			}
  		},
  		animation: {
  			'accordion-down': 'accordion-down 0.2s ease-out',
  			'accordion-up': 'accordion-up 0.2s ease-out'
  		}
  	}
  },
  plugins: [require("tailwindcss-animate")],
};
