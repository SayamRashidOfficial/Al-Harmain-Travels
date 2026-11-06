import os, sys
from bs4 import BeautifulSoup
from PIL import Image

def run_validation():
    image_path = 'public/og-image.jpg'
    if not os.path.exists(image_path):
        print(f'[FAIL] Missing image: {image_path}')
        return False

    img = Image.open(image_path)
    print(f'=== ASSET CHECK: {image_path} ===')
    print(f'Dimensions: {img.size[0]}x{img.size[1]} (Target: 1200x630)')
    print(f'Aspect ratio: {img.size[0]/img.size[1]:.4f} (Target: ~1.9048)')
    print(f'Format: {img.format}, File size: {os.path.getsize(image_path):,} bytes')

    if img.size != (1200, 630):
        print(f'[FAIL] Expected (1200, 630), found {img.size}')
        return False

    pages = [
        ('Homepage (/)', '.next/server/app/index.html', 'https://alharmaintravels.com'),
        ('Booking (/booking)', '.next/server/app/booking.html', 'https://alharmaintravels.com/booking'),
        ('Services (/services)', '.next/server/app/services.html', 'https://alharmaintravels.com/services'),
        ('About Us (/about)', '.next/server/app/about.html', 'https://alharmaintravels.com/about'),
        ('Contact Support (/contact)', '.next/server/app/contact.html', 'https://alharmaintravels.com/contact')
    ]

    private_pages = [
        ('Admin (/admin)', '.next/server/app/admin.html'),
        ('Dispatcher (/dispatcher)', '.next/server/app/dispatcher.html'),
        ('Driver (/driver)', '.next/server/app/driver.html'),
        ('Customer (/customer)', '.next/server/app/customer.html'),
        ('Sign In (/sign-in)', '.next/server/app/sign-in.html')
    ]

    total_passed = 0
    total_checks = 0

    def check(name, condition, details=''):
        nonlocal total_passed, total_checks
        total_checks += 1
        if condition:
            total_passed += 1
            print(f'  [PASS] {name} {details}')
        else:
            print(f'  [FAIL] {name} {details}')

    print('\n=== PUBLIC PAGES OPEN GRAPH & TWITTER CARD VALIDATION ===\n')

    for page_label, file_path, expected_url in pages:
        print('--------------------------------------------------')
        print(f'Validating: {page_label}')
        print(f'Canonical Target: {expected_url}')
        print('--------------------------------------------------')
        with open(file_path, 'r', encoding='utf-8') as f:
            soup = BeautifulSoup(f.read(), 'html.parser')

        # Title
        title = soup.title.string if soup.title else ''
        check('Title tag', bool(title), f'-> "{title}"')

        # Canonical
        can_tag = soup.find('link', rel='canonical')
        can_url = can_tag['href'] if can_tag else None
        check('Canonical link', can_url == expected_url, f'-> {can_url}')

        # Open Graph properties
        og_title = soup.find('meta', property='og:title')
        check('og:title', bool(og_title), f'-> "{og_title.get("content")}"' if og_title else '')

        og_desc = soup.find('meta', property='og:description')
        desc_val = og_desc.get('content') if og_desc else ''
        short_desc = (desc_val[:65] + '...') if len(desc_val) > 65 else desc_val
        check('og:description', bool(og_desc), f'-> "{short_desc}"')

        og_url = soup.find('meta', property='og:url')
        check('og:url', og_url and og_url.get('content') == expected_url, f'-> {og_url.get("content") if og_url else "None"}')

        og_site_name = soup.find('meta', property='og:site_name')
        check('og:site_name', og_site_name and og_site_name.get('content') == 'Al Harmain Travels', f'-> {og_site_name.get("content") if og_site_name else "None"}')

        og_locale = soup.find('meta', property='og:locale')
        check('og:locale', og_locale and og_locale.get('content') == 'en_US', f'-> {og_locale.get("content") if og_locale else "None"}')

        og_type = soup.find('meta', property='og:type')
        check('og:type', og_type and og_type.get('content') == 'website', f'-> {og_type.get("content") if og_type else "None"}')

        og_image = soup.find('meta', property='og:image')
        check('og:image', og_image and og_image.get('content') == 'https://alharmaintravels.com/og-image.jpg', f'-> {og_image.get("content") if og_image else "None"}')

        og_w = soup.find('meta', property='og:image:width')
        check('og:image:width', og_w and og_w.get('content') == '1200', f'-> {og_w.get("content") if og_w else "None"}')

        og_h = soup.find('meta', property='og:image:height')
        check('og:image:height', og_h and og_h.get('content') == '630', f'-> {og_h.get("content") if og_h else "None"}')

        og_alt = soup.find('meta', property='og:image:alt')
        check('og:image:alt', bool(og_alt), f'-> "{og_alt.get("content")}"' if og_alt else '')

        # Twitter tags
        tw_card = soup.find('meta', attrs={'name': 'twitter:card'})
        check('twitter:card', tw_card and tw_card.get('content') == 'summary_large_image', f'-> {tw_card.get("content") if tw_card else "None"}')

        tw_title = soup.find('meta', attrs={'name': 'twitter:title'})
        check('twitter:title', bool(tw_title), f'-> "{tw_title.get("content")}"' if tw_title else '')

        tw_desc = soup.find('meta', attrs={'name': 'twitter:description'})
        check('twitter:description', bool(tw_desc))

        tw_image = soup.find('meta', attrs={'name': 'twitter:image'})
        check('twitter:image', tw_image and tw_image.get('content') == 'https://alharmaintravels.com/og-image.jpg', f'-> {tw_image.get("content") if tw_image else "None"}')

        # Robots
        robots = soup.find('meta', attrs={'name': 'robots'})
        check('robots indexable', robots and 'index' in robots.get('content') and 'noindex' not in robots.get('content'), f'-> {robots.get("content") if robots else "None"}')

    print('\n=== PRIVATE DASHBOARD / AUTH PAGES NOINDEX VALIDATION ===\n')

    for priv_label, file_path in private_pages:
        with open(file_path, 'r', encoding='utf-8') as f:
            soup = BeautifulSoup(f.read(), 'html.parser')
        robots = soup.find('meta', attrs={'name': 'robots'})
        gbot = soup.find('meta', attrs={'name': 'googlebot'})
        is_noindex = robots and 'noindex' in robots.get('content')
        check(f'{priv_label} correctly blocked from indexing', is_noindex, f'-> robots="{robots.get("content") if robots else "None"}", googlebot="{gbot.get("content") if gbot else "None"}"')

    print('\n==================================================')
    print(f'SUMMARY: {total_passed}/{total_checks} CHECKS PASSED ({(total_passed/total_checks)*100:.1f}%)')
    print('==================================================')
    return total_passed == total_checks

if __name__ == '__main__':
    success = run_validation()
    sys.exit(0 if success else 1)

