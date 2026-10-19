"""Render article charts from the six archived runs; pass the iteration-512mb directory."""
import argparse
import csv
import json
from pathlib import Path
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('evidence', type=Path)
args = parser.parse_args()
out = Path(__file__).resolve().parents[1] / 'java-performance/experiments/img/mybatis-jooq-jdbi-512mb'
comparison = json.loads((args.evidence / 'main-comparison.json').read_text())
assert comparison['complete'] and not comparison['issues']
runs = [r for r in comparison['runs'] if not r['monitored']]
assert len(runs) == 6
colors = {'javalin-jdbi3': '#66d58b', 'javalin-mybatis': '#6caaff', 'javalin-jooq': '#efb864'}
names = {'javalin-jdbi3': 'Jdbi Core', 'javalin-mybatis': 'MyBatis Core', 'javalin-jooq': 'jOOQ OSE'}
plt.rcParams.update({
    'figure.facecolor': '#0b100d', 'axes.facecolor': '#111914',
    'axes.edgecolor': '#526459', 'text.color': '#e4eee7',
    'axes.labelcolor': '#c6d4ca', 'xtick.color': '#c6d4ca',
    'ytick.color': '#c6d4ca', 'grid.color': '#526459',
    'grid.alpha': .35, 'font.family': 'DejaVu Sans', 'font.size': 10,
    'svg.fonttype': 'none', 'svg.hashsalt': 'javalin-512mb',
})

def canvas(title):
    fig, axes = plt.subplots(2, 1, figsize=(9, 7.2), sharex=True, sharey=True)
    fig.subplots_adjust(left=.10, right=.98, top=.90, bottom=.09, hspace=.23)
    fig.suptitle(title, fontsize=13, fontweight='bold')
    for n, ax in enumerate(axes, 1):
        ax.set_title(f'Round {n}', loc='left', fontsize=11)
        ax.grid(axis='y')
        ax.spines[['top', 'right']].set_visible(False)
        ax.set_axisbelow(True)
    return fig, axes

memory, ma = canvas('Java resident memory during idle, workload and recovery')
latency, la = canvas('External HTTP p95 by workload minute')
seen = {}
for run in runs:
    variant = run['variant']
    round_index = seen.get(variant, 0)
    seen[variant] = round_index + 1
    directory = args.evidence / 'results/measured' / Path(run['run']).name
    analysis = json.loads((directory / 'analysis.json').read_text())
    phases = {p['phase']: p['epoch'] for p in json.loads((directory / 'phases.json').read_text())}
    rows = list(csv.DictReader((directory / 'guest/os.csv').open()))
    rows = [r for r in rows if phases['idle'] <= float(r['epoch']) <= phases['measurement-cutoff']]
    x = [(float(r['epoch']) - phases['workload']) / 60 for r in rows]
    y = [float(r['java_rss_kib']) / 1024 for r in rows]
    ma[round_index].plot(x, y, color=colors[variant], label=names[variant], linewidth=1.8)
    minutes = analysis['http']['minutes']
    assert all(minutes[str(i)]['count'] == 300 for i in range(1, 6))
    la[round_index].plot(range(1, 6), [minutes[str(i)]['p95_ms'] for i in range(1, 6)],
                         color=colors[variant], label=names[variant], marker='o', linewidth=1.8, markersize=4)
for ax in ma:
    ax.axvspan(0, 5, color='#66d58b', alpha=.07)
    ax.axvline(0, color='#526459', linewidth=.8)
    ax.axvline(5, color='#526459', linewidth=.8)
    ax.set(xlim=(-.5, 5.5), ylim=(90, 170), ylabel='Java RSS (MiB)')
    ax.text(.02, .92, 'Idle', transform=ax.transAxes, color='#c6d4ca', fontsize=9)
    ax.text(.46, .92, 'Workload', transform=ax.transAxes, color='#c6d4ca', fontsize=9)
    ax.text(.88, .92, 'Recovery', transform=ax.transAxes, color='#c6d4ca', fontsize=9)
ma[-1].set_xlabel('Minutes from workload start')
for ax in la:
    ax.set(ylabel='HTTP p95 (ms)', ylim=(0, 16), xticks=range(1, 6))
la[-1].set_xlabel('Workload minute (300 scheduled requests)')
for fig, axes, name in [(memory, ma, 'resident-memory'), (latency, la, 'request-latency')]:
    handles, labels = axes[0].get_legend_handles_labels()
    ordered = sorted(zip(handles, labels), key=lambda pair: ['Jdbi Core', 'MyBatis Core', 'jOOQ OSE'].index(pair[1]))
    axes[0].legend([p[0] for p in ordered], [p[1] for p in ordered], loc='lower right',
                   facecolor='#111914', edgecolor='#526459', labelcolor='#e4eee7', ncol=3, fontsize=9)
    fig.savefig(out / (name + '.svg'), metadata={'Date': None})
    svg = out / (name + '.svg')
    svg.write_text('\n'.join(line.rstrip() for line in svg.read_text().splitlines()) + '\n')
    plt.close(fig)
print('Rendered resident-memory.svg and request-latency.svg from six individual runs.')
