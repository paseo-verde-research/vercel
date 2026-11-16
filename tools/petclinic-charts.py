"""Render article charts from the published PetClinic benchmark observations."""
from pathlib import Path
from html import escape

DEST = Path(__file__).resolve().parents[1] / 'articles/img/coilbase-petclinic'
COLORS = ('#91a9cc', '#65dfa4')

def chart(name, title, subtitle, rows, maximum, unit, height):
    width = 720
    step = (height - 160) / len(rows)
    parts = [f'<svg xmlns="http://www.w3.org/2000/svg" width="720" height="{height}" viewBox="0 0 720 {height}" role="img" aria-labelledby="title desc">', f'<title id="title">{escape(title)}</title><desc id="desc">{escape(subtitle)}</desc>', f'<rect width="720" height="{height}"  fill="#14201e"/>', '<g font-family="Arial, sans-serif" fill="#edf5f1">', f'<text x="28" y="38" font-size="25" font-weight="700">{escape(title)}</text>', f'<text x="28" y="65" font-size="15" fill="#bbc9c4">{escape(subtitle)}</text>']
    for j, label in enumerate(('Spring PetClinic', 'CoilBase PetClinic')):
        x = 28 + j * 235
        parts += [f'<rect x="{x}" y="85" width="13" height="13" fill="{COLORS[j]}"/>', f'<text x="{x+21}" y="97" font-size="16">{label}</text>']
    plot_x, plot_w = 240, 380
    for n in range(5):
        x = plot_x + plot_w*n/4
        parts.append(f'<path d="M{x} 120 V{height-39}" stroke="#34453f"/>')
        parts.append(f'<text x="{x}" y="{height-16}" text-anchor="middle" font-size="14" fill="#bbc9c4">{maximum*n/4:g}</text>')
    for i, (label, values) in enumerate(rows):
        y = 132 + i * step
        parts.append(f'<text x="28" y="{y+19}" font-size="17">{escape(label)}</text>')
        for j, (value, display) in enumerate(values):
            by = y + j*25
            length = value/maximum*plot_w
            parts += [f'<rect x="{plot_x}" y="{by}" width="{length:.2f}" height="17"  fill="{COLORS[j]}"/>', f'<text x="{plot_x+length+9}" y="{by+14}" font-size="16">{display}</text>']
    parts += ['</g></svg>']
    (DEST/name).write_text('\n'.join(parts))

chart('application-rss.svg', '59% less application memory', 'Median process RSS · one short workload plus quiet interval · MiB', [('Application RSS', [(304.4,'304.4'),(125.9,'125.9')])], 360, 'MiB', 270)
chart('deployment-size.svg', '85% smaller complete deployment', 'Uncompressed application and runtime libraries · MiB', [('Deployed files', [(65607443/1048576,'62.6'),(9775305/1048576,'9.3')])], 80, 'MiB', 270)
chart('owner-readiness.svg', 'Time to first owner page', 'Launch to complete owner page · median of three starts · seconds', [('Owner readiness', [(19.76,'19.76'),(2.63,'2.63')])], 24, 'seconds', 270)
paths = [('Welcome',7.78,2.85),('Owner search form',10.37,1.81),('Search + redirect',38.18,9.54),('Owner details',23.03,5.11),('Owner edit form',20.35,5.61),('New pet form',46.10,7.13),('Vet HTML',15.23,9.54),('Vet JSON',5.84,9.21)]
chart('request-timings.svg', 'Lower medians on seven of eight paths', '20 serial requests per path after warmup · complete reads · milliseconds', [(label,[(a,f'{a:.2f}'),(b,f'{b:.2f}')]) for label,a,b in paths], 50, 'ms', 820)
