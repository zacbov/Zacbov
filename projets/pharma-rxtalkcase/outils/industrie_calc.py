"""Cas « Industrie et recherche » à réponses calculées (contrôle qualité, stabilité, galénique, pharmacovigilance,
médico-économie, nettoyage). Toutes les valeurs sont générées puis recalculées ici : la réponse attendue est exacte.
Référentiels : Ph. Eur. 2.9.40 (uniformité de teneur), 2.9.3 (dissolution), ICH Q1E (stabilité), EMA/FDA (f2),
Evans 2001 (PRR), HAS (RDCR), PDE/MACO (nettoyage, EMA 2014)."""
import math, random, statistics as st
from scipy import stats

def fr(x, n=1):
    return f"{x:.{n}f}".replace('.', ',')

# ---------------------------------------------------------------- uniformité de teneur (Ph. Eur. 2.9.40)
def av(xs, T=100.0):
    m, s = st.mean(xs), st.stdev(xs)
    k = 2.4 if len(xs) == 10 else 2.0
    if T <= 101.5:
        M = m if 98.5 <= m <= 101.5 else (98.5 if m < 98.5 else 101.5)
    else:
        M = m if 98.5 <= m <= T else (98.5 if m < 98.5 else T)
    return m, s, M, abs(M - m) + k * s, k

def uniformite(rng, scenario):
    if scenario == 'conforme':
        xs = [round(rng.gauss(99.6, 2.1), 1) for _ in range(10)]
        while av(xs)[3] > 13: xs = [round(rng.gauss(99.6, 2.1), 1) for _ in range(10)]
        xs2 = None
    else:
        while True:
            xs = [round(rng.gauss(97.2, 4.6), 1) for _ in range(10)]
            if 15.5 < av(xs)[3] < 19: break
        while True:
            xs2 = [round(rng.gauss(98.6 if scenario == 'stade2_ok' else 96.0, 3.4 if scenario == 'stade2_ok' else 6.2), 1) for _ in range(20)]
            a = av(xs + xs2)[3]
            if scenario == 'stade2_ok' and a < 14.5 and all(0.75 * av(xs + xs2)[2] <= x <= 1.25 * av(xs + xs2)[2] for x in xs + xs2): break
            if scenario == 'stade2_ko' and 16 < a < 22: break
    m, s, M, A, k = av(xs)
    lignes = [[str(i + 1), fr(x)] for i, x in enumerate(xs)]
    r = (f"Stade 1 (n = 10, k = 2,4) : moyenne X̄ = {fr(m, 2)} %, écart-type s = {fr(s, 2)} %. "
         f"98,5 ≤ X̄ ≤ 101,5 ? {'oui → M = X̄' if M == m else 'non → M = ' + fr(M, 1) + ' %'}. "
         f"AV = |M − X̄| + k·s = {fr(abs(M - m), 2)} + 2,4 × {fr(s, 2)} = {fr(A, 2)} %. Limite L1 = 15,0.")
    if xs2 is None:
        r += " AV ≤ 15 : conforme au stade 1, aucune unité supplémentaire à tester."
        concl = "Lot conforme à l'essai d'uniformité de teneur (stade 1)."
    else:
        r += " AV > 15 : non conforme au stade 1, on teste 20 unités de plus (stade 2, n = 30, k = 2,0)."
        m2, s2, M2, A2, k2 = av(xs + xs2)
        hors = [x for x in xs + xs2 if not (0.75 * M2 <= x <= 1.25 * M2)]
        r += (f"\nStade 2 (n = 30) : X̄ = {fr(m2, 2)} %, s = {fr(s2, 2)} %, M = {fr(M2, 2)} %, AV = {fr(abs(M2 - m2), 2)} + 2,0 × {fr(s2, 2)} = {fr(A2, 2)} % "
              f"(L1 = 15). Aucune unité hors de [(1 − 0,25)M ; (1 + 0,25)M] = [{fr(0.75 * M2)} ; {fr(1.25 * M2)}] % (L2 = 25) : {'respecté' if not hors else 'NON respecté (' + ', '.join(fr(x) for x in hors) + ')'}.")
        ok = A2 <= 15 and not hors
        concl = "Lot conforme au stade 2." if ok else "Lot non conforme : déviation, investigation (procédé : mélange, ségrégation, compression) et blocage du lot ; pas de nouvel essai « pour voir »."
        lignes += [[str(i + 11), fr(x)] for i, x in enumerate(xs2)]
    return lignes, r, concl

# ---------------------------------------------------------------- dissolution (Ph. Eur. 2.9.3, Q = 80 %)
def dissolution(rng, cible):
    Q = 80
    def s1(v): return all(x >= Q + 5 for x in v[:6])
    def s2(v): return st.mean(v[:12]) >= Q and all(x >= Q - 15 for x in v[:12])
    def s3(v): return st.mean(v) >= Q and sum(x < Q - 15 for x in v) <= 2 and all(x >= Q - 25 for x in v)
    while True:
        mu = {'S1': 91, 'S2': 84, 'S3': 81, 'echec': 77}[cible]
        v = [round(rng.gauss(mu, 5 if cible != 'S1' else 3)) for _ in range(24)]
        if cible == 'S1' and s1(v): break
        if cible == 'S2' and not s1(v) and s2(v): break
        if cible == 'S3' and not s1(v) and not s2(v) and s3(v): break
        if cible == 'echec' and not s1(v) and not s2(v) and not s3(v) and st.mean(v) > 70: break
    n = {'S1': 6, 'S2': 12, 'S3': 24, 'echec': 24}[cible]
    v = v[:n]
    lignes = [[str(i + 1), str(x)] for i, x in enumerate(v)]
    r = (f"Q = {Q} % en 30 min. S1 (6 unités) : chacune ≥ Q + 5 = 85 % ? {'oui' if s1(v) else 'non (minimum ' + str(min(v[:6])) + ' %)'}.")
    if n >= 12:
        r += f"\nS2 (12 unités) : moyenne {fr(st.mean(v[:12]))} % ≥ Q et aucune < Q − 15 = 65 % ? {'oui' if s2(v) else 'non'}."
    if n >= 24:
        r += (f"\nS3 (24 unités) : moyenne {fr(st.mean(v))} % ≥ Q, au plus 2 unités < 65 % ({sum(x < 65 for x in v)}), aucune < Q − 25 = 55 % ({sum(x < 55 for x in v)}) ? "
              f"{'oui' if s3(v) else 'non'}.")
    concl = {'S1': 'Conforme dès S1.', 'S2': 'Conforme en S2.', 'S3': 'Conforme en S3 (à surveiller : profil limite, tendance à analyser).', 'echec': 'Non conforme en S3 : résultat hors spécification, investigation OOS.'}[cible]
    return lignes, r, concl

# ---------------------------------------------------------------- stabilité (ICH Q1E, borne inférieure unilatérale à 95 %)
def stabilite(rng, pente, bruit, mois=(0, 3, 6, 9, 12, 18), spec=95.0, propose=36):
    x = list(mois)
    y = [round(100.4 + pente * t + rng.gauss(0, bruit), 1) for t in x]
    n = len(x); xb = st.mean(x); b, a = stats.linregress(x, y)[:2]
    res = [yi - (a + b * xi) for xi, yi in zip(x, y)]; s = math.sqrt(sum(r * r for r in res) / (n - 2)); Sxx = sum((xi - xb) ** 2 for xi in x)
    t95 = stats.t.ppf(0.95, n - 2)
    def borne(t): return a + b * t - t95 * s * math.sqrt(1 / n + (t - xb) ** 2 / Sxx)
    tt = 0.0
    while borne(tt) >= spec and tt < 120: tt += 0.1
    duree = math.floor(tt)
    maxi = min(2 * max(x), max(x) + 12)
    lignes = [[str(t), fr(v)] for t, v in zip(x, y)]
    r = (f"Régression du titre sur le temps : titre = {fr(a, 2)} {'−' if b < 0 else '+'} {fr(abs(b), 3)} × t (mois). "
         f"Borne inférieure unilatérale de l'intervalle de confiance à 95 % de la moyenne (t = {fr(t95, 3)}, ddl = {n - 2}) : "
         f"elle coupe la spécification de {fr(spec)} % à environ {fr(tt, 1)} mois → durée de conservation statistique ≈ {duree} mois. "
         f"Extrapolation au-delà des données réelles ({max(x)} mois) : au plus 2 fois la durée couverte et pas plus de 12 mois au-delà, soit {maxi} mois maximum "
         f"(si pas de « changement significatif » en accéléré et données à long terme peu variables).")
    ok = min(duree, maxi)
    concl = (f"Durée de conservation défendable aujourd'hui : {ok} mois (proposition de {propose} mois "
             f"{'acceptable' if propose <= ok else 'non acceptable en l’état : la ramener à ' + str(ok) + ' mois et la prolonger ensuite avec les points à 24 et 36 mois (variation)'}).")
    return lignes, r, concl, ok

# ---------------------------------------------------------------- Arrhenius
def arrhenius(rng):
    Ea = rng.choice([75, 82, 90, 96]) * 1000; R = 8.314
    k40 = rng.choice([0.0021, 0.0034, 0.0045])                       # par jour, ordre 1
    T = [313.15, 323.15, 333.15]
    k = [k40 * math.exp(-Ea / R * (1 / t - 1 / 313.15)) for t in T]
    k = [round(v, 5) for v in k]
    sl, ic = stats.linregress([1 / t for t in T], [math.log(v) for v in k])[:2]
    Ea_c = -sl * R
    k25 = math.exp(ic + sl / 298.15)
    t90 = math.log(100 / 90) / k25
    lignes = [['40', fr(k[0], 5)], ['50', fr(k[1], 5)], ['60', fr(k[2], 5)]]
    r = (f"Ordre 1 : ln k = ln A − Ea / (R·T). Régression de ln k sur 1/T : pente = {fr(sl, 0)} K → Ea = −pente × R ≈ {fr(Ea_c / 1000, 1)} kJ/mol. "
         f"Extrapolation à 25 °C (298,15 K) : k25 ≈ {fr(k25 * 1e4, 2)} × 10⁻⁴ j⁻¹. t90 = ln(100/90) / k25 = 0,1054 / k25 ≈ {fr(t90, 0)} jours, soit ≈ {fr(t90 / 30.4, 1)} mois.")
    concl = ("Estimation indicative seulement : la durée de conservation se fonde sur les études en temps réel (ICH Q1A/Q1E) ; l'accéléré sert à anticiper, "
             "pas à remplacer. Vérifier aussi que le mécanisme de dégradation est le même aux trois températures (sinon l'extrapolation ne tient pas).")
    return lignes, r, concl

# ---------------------------------------------------------------- f2
def f2(rng, cas):
    tps = [10, 15, 20, 30, 45]
    if cas == 'rapide':
        R = [72, 90, 95, 98, 99]; T = [70, 88, 94, 97, 99]
    else:
        base = [38, 52, 63, 78, 89]
        R = [b + rng.randint(-2, 2) for b in base]
        d = 4 if cas == 'similaire' else 13
        T = [min(99, max(1, r - d + rng.randint(-2, 2))) for r in R]
    # points retenus : tous jusqu'au premier point > 85 % pour les deux (un seul point > 85 %)
    garde = []
    for i in range(len(tps)):
        garde.append(i)
        if R[i] > 85 and T[i] > 85: break
    n = len(garde)
    msd = sum((R[i] - T[i]) ** 2 for i in garde) / n
    val = 50 * math.log10(100 / math.sqrt(1 + msd))
    lignes = [[str(t), str(r), str(x)] for t, r, x in zip(tps, R, T)]
    if cas == 'rapide':
        r = ("Les deux formulations libèrent plus de 85 % en 15 minutes ou moins : dissolution « très rapide ». "
             "Le calcul de f2 n'est pas nécessaire, les profils sont considérés comme similaires (EMA, ligne directrice bioéquivalence ; FDA).")
        concl = "Similarité démontrée sans f2 (dissolution très rapide), à documenter dans les 3 milieux (pH 1,2 ; 4,5 ; 6,8)."
    else:
        r = (f"f2 = 50 × log10(100 / √(1 + (1/n) Σ(Rt − Tt)²)). Points retenus : {', '.join(str(tps[i]) for i in garde)} min (n = {n} ; un seul point > 85 % au plus). "
             f"Moyenne des carrés des écarts = {fr(msd, 1)} → f2 = {fr(val, 1)}.")
        concl = ("f2 ≥ 50 : profils similaires (écart moyen < 10 %)." if val >= 50 else "f2 < 50 : profils non similaires ; la variation ne peut pas s'appuyer sur la seule dissolution (reformulation ou étude de bioéquivalence).") + \
                " Conditions : 12 unités par lot, CV ≤ 20 % au 1er point et ≤ 10 % ensuite, mêmes conditions d'essai."
    return lignes, r, concl, round(val, 1) if cas != 'rapide' else None

# ---------------------------------------------------------------- PRR (Evans 2001)
def prr(a, b, c, d):
    p = (a / (a + b)) / (c / (c + d))
    se = math.sqrt(1 / a - 1 / (a + b) + 1 / c - 1 / (c + d))
    lo, hi = math.exp(math.log(p) - 1.96 * se), math.exp(math.log(p) + 1.96 * se)
    n = a + b + c + d
    chi = n * (abs(a * d - b * c) - n / 2) ** 2 / ((a + b) * (c + d) * (a + c) * (b + d))   # chi² de Yates
    return p, lo, hi, chi

# ---------------------------------------------------------------- RDCR
def rdcr(cA, eA, cB, eB):
    dc, de = cB - cA, eB - eA
    if dc <= 0 and de >= 0: return dc, de, None, 'dominante'
    if dc >= 0 and de <= 0: return dc, de, None, 'dominée'
    return dc, de, dc / de, 'ratio'

# ---------------------------------------------------------------- MACO (PDE)
def maco(pde_mg, lot_kg, dose_max_mg):
    return pde_mg * lot_kg * 1e6 / dose_max_mg      # mg : PDE (mg/j) × taille du lot suivant (mg) / dose journalière max du suivant (mg)
