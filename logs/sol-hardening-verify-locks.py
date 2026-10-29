import hashlib, json, re, subprocess
from pathlib import Path

def git(*args):
    return subprocess.check_output(['git', *args])

base = '8c06396'
locked = ['src/stage1-def.js', 'src/stage2-def.js', 'src/stage3-def.js', 'src/eggplant.js', 'src/config.js', 'src/camera.js', 'src/barks.js', 'src/papacito.js', 'src/dad-call.js', 'src/wingman.js', 'src/parallax.js']
for file in locked:
    assert git('show', f'{base}:{file}') == Path(file).read_bytes(), file
assets = git('ls-tree', '-r', '--name-only', base, 'assets/bg', 'assets/chars', 'assets/cutscenes', 'assets/audio/voice/bdb_open.mp3', 'assets/audio/voice/bdb_produce.mp3').decode().splitlines()
exceptions = {'assets/bg/MANIFEST.json', 'assets/chars/_pack_report.json'}
for file in assets:
    if file not in exceptions:
        assert git('show', f'{base}:{file}') == Path(file).read_bytes(), file
assert not git('diff', 'HEAD', '--', 'assets/bg', 'assets/chars')
stream = Path('src/zone-stream.js').read_text()
assert re.sub(r'  4: Object\.freeze\(\{[\s\S]*?\n  \}\),\n', '', stream) == git('show', f'{base}:src/zone-stream.js').decode()
clip = Path('src/cutscene.js').read_text()
assert re.sub(r"  stage[1-4]: \['stage[1-4]_intro'\],\n", '', clip) == git('show', f'{base}:src/cutscene.js').decode()
old_y = git('show', f'{base}:src/yettis.js').decode()
new_y = Path('src/yettis.js').read_text()
for pattern in [r'export function choirMultiplier[\s\S]*?(?=/\*\* Dashed)', r'const CHOIR_AURA[\s\S]*?(?=/\*\* Same-lane)', r"else if \(\['choir','choirmaster'\][\s\S]*?(?=          \} else if)"]:
    a, b = re.search(pattern, old_y), re.search(pattern, new_y)
    assert a and b and a.group() == b.group(), pattern
old_c = git('show', f'{base}:src/campaign.js').decode()
new_c = Path('src/campaign.js').read_text()
for pattern in [r'export function snowClearZ[\s\S]*?\n\}', r'export const NIGHTMARE_S3[\s\S]*?export const ADVENTURE_S3_DAMAGE = 1;', r'this\.papiTime=2\.5;', r'  summonWalkers\(\) \{[^\n]*\}']:
    a, b = re.search(pattern, old_c), re.search(pattern, new_c)
    assert a and b and a.group() == b.group(), pattern
quotes = ['I brought the eggplant.', 'Die, Yetti, die!', 'Son, sometimes you just need to use the fly swatter to keep the women away!', 'Pork Chop Sandwiches!', 'Stay away from the Colombians room.', 'Bob why is your car purple?', "Hold on Claudia! Papacito is coming! It's eggplant time!", 'We love you Papacito! Pick me!']
for file in ['src/voice-lines.js', 'assets/audio/voice-manifest.json']:
    old, new = git('show', f'{base}:{file}').decode(), Path(file).read_text()
    for quote in quotes:
        assert old.count(quote) == new.count(quote), (file, quote)
sha = lambda p: hashlib.sha256(Path(p).read_bytes()).hexdigest()
assert sha('assets/cutscenes/stage1_intro.mp4') == sha('/workspace/bdb-art/cutscenes/stage1_intro.mp4')
for file in ['stage1_intro.jpg', 'stage1_intro_poster.jpg']:
    assert sha(f'assets/cutscenes/{file}') == sha('/workspace/bdb-art/cutscenes/stage1_intro_poster.jpg')
for stage in [2, 3, 4]:
    assert not Path(f'assets/cutscenes/stage{stage}_intro.mp4').exists()
report = dict(baseline=base, head=git('rev-parse', 'HEAD').decode().strip(), branch=git('branch', '--show-current').decode().strip(), lockedFiles=locked, lockedFileDiff='', existingAssetFilesChecked=len(assets)-len(exceptions), changedExistingAssets=[], stage4AssetsUnchangedFromTip=True, zoneStreamOnlyAdds4=True, cutsceneOnlyAddsStage1Through4=True, choirBlocksUnchanged=True, nightmareS3AndSnowClearUnchanged=True, papiTimeAndSummonWalkersUnchanged=True, lockedQuotesUnchanged=True, stage1MediaByteIdenticalToSource=True, stage2Through4MediaAbsent=True)
Path('logs/sol-hardening-locks.json').write_text(json.dumps(report, indent=2) + '\n')
print(json.dumps(report, indent=2))
