# Component Guide

## Gradient Button Component

A reusable button component with beautiful gradient styles and built-in variants.

### Features
- **Default Blue Gradient** (matches your design system)
- **Purple Gradient** variant
- **Custom styles** support
- Three sizes: `sm`, `default`, `lg`
- Loading and disabled states
- Hover effects with smooth transitions
- Focus ring for accessibility

### Usage

```tsx
import { GradientButton } from '@/components/ui/gradient-button';

// Default blue gradient button
<GradientButton onClick={handleClick}>
  Click Me
</GradientButton>

// Purple variant
<GradientButton variant="purple" size="lg">
  Get Started
</GradientButton>

// Small size
<GradientButton size="sm">
  Small Button
</GradientButton>

// Disabled state
<GradientButton disabled>
  Disabled
</GradientButton>

// With custom style
<GradientButton
  variant="custom"
  customStyle={{
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    boxShadow: '0 4px 14px 0 rgba(102, 126, 234, 0.4)',
  }}
>
  Custom Gradient
</GradientButton>

// With icon
<GradientButton>
  <PlayIcon className="w-4 h-4 mr-2" />
  Play Video
</GradientButton>
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `variant` | `'default' \| 'purple' \| 'custom'` | `'default'` | Button gradient variant |
| `size` | `'sm' \| 'default' \| 'lg'` | `'default'` | Button size |
| `customStyle` | `React.CSSProperties` | `undefined` | Custom inline styles (only used with `variant="custom"`) |
| `className` | `string` | `''` | Additional CSS classes |
| `...props` | `ButtonHTMLAttributes` | - | All standard button props |

### Default Styles

**Default (Blue) Gradient:**
```css
background: linear-gradient(135deg, hsla(204, 15%, 61%, 1.00) 0%, hsla(215, 46%, 54%, 1.00) 100%)
box-shadow: 0 4px 14px 0 rgba(75, 167, 229, 0.25), inset 0 1px 0 0 rgba(255, 255, 255, 0.2)
```

**Purple Gradient:**
```css
background: linear-gradient(135deg, hsl(262 68% 57%) 0%, hsl(262 68% 67%) 100%)
box-shadow: 0 4px 14px 0 rgba(119, 75, 229, 0.25), inset 0 1px 0 0 rgba(255, 255, 255, 0.2)
```

---

## Loader Component

An animated SVG loader with a beautiful line-drawing animation effect in golden color.

### Features
- Smooth line-drawing animation (4s loop)
- Four size options
- Golden glow effect
- Transparent background
- Perfect for inline loading states

### Usage

```tsx
import { Loader } from '@/components/ui/loader';

// Medium size (default)
<Loader />

// Small size
<Loader size="sm" />

// Large size
<Loader size="lg" />

// Extra large
<Loader size="xl" />

// With custom className
<Loader size="md" className="my-custom-class" />
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `size` | `'sm' \| 'md' \| 'lg' \| 'xl'` | `'md'` | Loader size |
| `className` | `string` | `''` | Additional CSS classes |

### Size Dimensions

- `sm`: 150x150px
- `md`: 300x300px
- `lg`: 450x450px
- `xl`: 600x600px

---

## Page Loader Component

A full-screen loading overlay with the animated loader and optional text.

### Features
- Full-screen overlay with black background
- Centered loader animation
- Optional loading text
- Fixed positioning (covers entire viewport)
- Z-index 9999 (appears above everything)

### Usage

```tsx
import { PageLoader } from '@/components/ui/page-loader';
import { useState } from 'react';

function MyComponent() {
  const [isLoading, setIsLoading] = useState(false);

  const handleLoadData = async () => {
    setIsLoading(true);
    await fetchData();
    setIsLoading(false);
  };

  return (
    <>
      {isLoading && <PageLoader text="Loading data..." />}

      <button onClick={handleLoadData}>
        Load Data
      </button>
    </>
  );
}

// Without text
<PageLoader showText={false} />

// With custom text
<PageLoader text="Please wait..." />
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `text` | `string` | `'Loading...'` | Loading text to display |
| `showText` | `boolean` | `true` | Whether to show the text |

---

## Component Showcase

Visit **`/showcase`** to see all components in action with interactive examples!

The showcase page includes:
- All button variants and sizes
- All loader sizes
- Page loader demo
- Usage examples with code snippets

---

## Integration Examples

### Admin Dashboard Operations

Replace existing buttons in your admin dashboard:

```tsx
// Before
<button
  onClick={confirmRegister}
  disabled={processing}
  className="flex-1 font-inter font-medium rounded-xl"
  style={{
    background: 'linear-gradient(135deg, hsl(262 68% 57%) 0%, hsl(262 68% 67%) 100%)',
    boxShadow: '0 4px 14px 0 rgba(119, 75, 229, 0.25)',
  }}
>
  {processing ? 'Registering...' : 'Confirm'}
</button>

// After
<GradientButton
  onClick={confirmRegister}
  disabled={processing}
  variant="purple"
  className="flex-1"
>
  {processing ? 'Registering...' : 'Confirm'}
</GradientButton>
```

### Auth Page

Update auth page buttons:

```tsx
// Connect DigiLocker Button
<GradientButton
  onClick={handleOpenDocumentModal}
  size="lg"
  className="w-full"
>
  Connect DigiLocker
</GradientButton>

// Login Button
<GradientButton
  onClick={handleLogin}
  variant="purple"
  size="lg"
  className="w-full"
>
  Login
</GradientButton>
```

### Loading States

Add loading overlays:

```tsx
import { PageLoader } from '@/components/ui/page-loader';
import { Loader } from '@/components/ui/loader';

function DataTable() {
  const [isLoading, setIsLoading] = useState(true);

  // Full page loader
  if (isLoading) {
    return <PageLoader text="Loading assets..." />;
  }

  // Inline loader
  return (
    <div>
      {isLoadingMore && (
        <div className="flex justify-center py-8">
          <Loader size="sm" />
        </div>
      )}
      {/* Table content */}
    </div>
  );
}
```

---

## Best Practices

1. **Use the default blue gradient** for primary actions throughout the app
2. **Use the purple variant** for special calls-to-action or premium features
3. **Use PageLoader** for full-page loading states (data fetching, navigation)
4. **Use inline Loader** for component-level loading (tables, cards)
5. **Keep button text concise** - ideal length is 1-3 words
6. **Add icons** to buttons for better visual communication
7. **Always provide disabled states** for async operations

---

## Animation Details

### Loader Animation
- **Duration**: 4 seconds
- **Timing**: cubic-bezier(0.45, 0, 0.55, 1)
- **Loop**: Infinite
- **Color**: Golden (#d4af37)
- **Effect**: Drop shadow glow

### Button Hover
- **Duration**: 200ms
- **Effect**: Opacity 90%, translate-y -0.5px
- **Disabled**: No hover effect

---

## Browser Support

All components work in:
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

---

## Routes

- **Component Showcase**: `/showcase`
- **Admin Dashboard**: `/admin`
- **Auth Page**: `/auth`

---

## Notes

- All components use your existing design system (Antic Didone, Inter fonts)
- Components are fully TypeScript typed
- Accessible (keyboard navigation, focus states)
- Responsive (works on mobile, tablet, desktop)
- Ready for backend integration (see console logs in showcase)
