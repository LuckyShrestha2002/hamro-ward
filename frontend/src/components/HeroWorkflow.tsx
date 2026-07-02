import { useEffect, useRef } from 'react';

/**
 * Animated isometric "photo → AI → Nibedan → ward office" workflow shown on the
 * landing hero. The artwork is a fixed 600×640 stage; a ResizeObserver scales it
 * down to fit narrow columns (so it never overflows on small screens). Markup is
 * static and self-contained, so it's injected via dangerouslySetInnerHTML to keep
 * the heavily inline-styled illustration faithful to the design.
 */
const ART = `
<div data-hw-scaler style="position:absolute;left:50%;top:50%;width:600px;height:640px;transform-origin:center center;transform:translate(-50%,-50%) scale(1);">
<div style="position:relative;width:600px;height:640px;transform:perspective(2000px) rotateX(7deg) rotateY(-16deg) rotateZ(1deg);transform-style:preserve-3d;">

  <!-- ground glow -->
  <div style="position:absolute;left:40px;right:40px;bottom:48px;height:170px;background:radial-gradient(ellipse at center,rgba(11,27,63,.15),rgba(11,27,63,0) 70%);filter:blur(6px);transform:translateZ(-60px);"></div>

  <!-- ward office building -->
  <div style="position:absolute;top:8px;right:8px;width:230px;transform:translateZ(-40px);">
    <div style="position:relative;background:linear-gradient(180deg,#fff,#F2F6FC);border:1px solid #E1E8F4;border-radius:14px 14px 0 0;padding:14px 16px 0;box-shadow:0 20px 40px -22px rgba(11,27,63,.4);">
      <div style="position:absolute;left:50%;top:-22px;transform:translateX(-50%);width:0;height:0;border-left:120px solid transparent;border-right:120px solid transparent;border-bottom:24px solid #1a365d;"></div>
      <div style="position:absolute;left:50%;top:-7px;transform:translateX(-50%);width:10px;height:14px;background:#DC143C;clip-path:polygon(0 0,100% 0,100% 60%,0 100%);"></div>
      <div style="display:flex;justify-content:space-between;gap:8px;margin-bottom:11px;">
        <div style="flex:1;height:34px;border-radius:6px;background:linear-gradient(180deg,#DCE6F5,#C6D5ED);border:1px solid #B9CBEA;"></div>
        <div style="flex:1;height:34px;border-radius:6px;background:linear-gradient(180deg,#DCE6F5,#C6D5ED);border:1px solid #B9CBEA;"></div>
        <div style="flex:1;height:34px;border-radius:6px;background:linear-gradient(180deg,#DCE6F5,#C6D5ED);border:1px solid #B9CBEA;"></div>
      </div>
      <div style="display:flex;justify-content:space-between;gap:8px;margin-bottom:11px;">
        <div style="flex:1;height:34px;border-radius:6px;background:linear-gradient(180deg,#DCE6F5,#C6D5ED);border:1px solid #B9CBEA;"></div>
        <div style="flex:1;height:34px;border-radius:6px;background:linear-gradient(180deg,#DCE6F5,#C6D5ED);border:1px solid #B9CBEA;"></div>
        <div style="flex:1;height:34px;border-radius:6px;background:linear-gradient(180deg,#DCE6F5,#C6D5ED);border:1px solid #B9CBEA;"></div>
      </div>
      <div style="display:flex;justify-content:center;"><div style="width:46px;height:30px;border-radius:6px 6px 0 0;background:#1a365d;"></div></div>
    </div>
    <div style="height:7px;background:linear-gradient(90deg,#003893,#1a365d);border-radius:0 0 4px 4px;"></div>
    <div style="text-align:center;margin-top:8px;font-size:10.5px;font-weight:800;letter-spacing:1.5px;color:#7C8DAC;text-transform:uppercase;">Ward Office</div>
  </div>

  <!-- connecting flow lines -->
  <svg width="600" height="640" viewBox="0 0 600 640" fill="none" style="position:absolute;inset:0;transform:translateZ(8px);overflow:visible;">
    <path d="M150 168 C 210 200, 250 200, 300 232" stroke="#9FB4D6" stroke-width="2.5" stroke-dasharray="7 7" stroke-linecap="round" style="animation:hw-dash 1.1s linear infinite;"></path>
    <path d="M315 360 C 280 396, 250 404, 210 432" stroke="#9FB4D6" stroke-width="2.5" stroke-dasharray="7 7" stroke-linecap="round" style="animation:hw-dash 1.1s linear infinite;"></path>
    <path d="M300 520 C 360 510, 400 500, 452 470" stroke="#9FB4D6" stroke-width="2.5" stroke-dasharray="7 7" stroke-linecap="round" style="animation:hw-dash 1.1s linear infinite;"></path>
  </svg>

  <!-- STEP 1 : phone capture -->
  <div style="position:absolute;top:34px;left:6px;width:166px;transform:translateZ(60px);animation:hw-float 6s ease-in-out infinite;">
    <div style="position:absolute;top:-13px;left:-13px;z-index:3;width:30px;height:30px;border-radius:50%;background:#DC143C;color:#fff;font-size:14px;font-weight:800;display:flex;align-items:center;justify-content:center;box-shadow:0 6px 14px -3px rgba(220,20,60,.6);">1</div>
    <div style="background:#0E1B33;border-radius:24px;padding:9px;box-shadow:0 26px 46px -18px rgba(11,27,63,.55);">
      <div style="position:relative;border-radius:16px;overflow:hidden;height:200px;background:linear-gradient(180deg,#1B3A6B 0%,#24517F 55%,#3C6A8E 100%);">
        <div style="position:absolute;top:9px;left:50%;transform:translateX(-50%);width:38px;height:5px;border-radius:3px;background:rgba(255,255,255,.35);"></div>
        <div style="position:absolute;left:30px;bottom:0;width:7px;height:120px;background:#9FB0C9;border-radius:3px;"></div>
        <div style="position:absolute;left:24px;top:64px;width:48px;height:9px;background:#9FB0C9;border-radius:3px;"></div>
        <div style="position:absolute;left:64px;top:62px;width:20px;height:14px;background:#536A8C;border-radius:3px 3px 5px 5px;"></div>
        <div style="position:absolute;left:66px;top:78px;width:16px;height:16px;border-radius:50%;background:radial-gradient(circle,#FFE08A,rgba(255,224,138,0));opacity:.5;animation:hw-pulse 1.6s infinite;"></div>
        <div style="position:absolute;right:14px;top:18px;font-size:14px;">⚡</div>
        <div style="position:absolute;left:0;right:0;bottom:0;height:30px;background:linear-gradient(180deg,rgba(40,70,30,0),#2E4A22);"></div>
        <div style="position:absolute;inset:14px;border:2px solid rgba(255,255,255,.55);border-radius:10px;"></div>
        <div style="position:absolute;top:9px;left:9px;width:14px;height:14px;border-top:2px solid #FFD84D;border-left:2px solid #FFD84D;"></div>
        <div style="position:absolute;top:9px;right:9px;width:14px;height:14px;border-top:2px solid #FFD84D;border-right:2px solid #FFD84D;"></div>
        <div style="position:absolute;bottom:9px;left:9px;width:14px;height:14px;border-bottom:2px solid #FFD84D;border-left:2px solid #FFD84D;"></div>
        <div style="position:absolute;bottom:9px;right:9px;width:14px;height:14px;border-bottom:2px solid #FFD84D;border-right:2px solid #FFD84D;"></div>
        <div style="position:absolute;left:50%;bottom:30px;transform:translateX(-50%);width:38px;height:38px;border-radius:50%;border:3px solid #fff;background:rgba(255,255,255,.25);"></div>
        <div style="position:absolute;top:50px;left:50%;transform:translateX(-50%);padding:3px 10px;background:rgba(220,20,60,.92);border-radius:6px;font-size:9.5px;font-weight:800;color:#fff;letter-spacing:.5px;">● REC ISSUE</div>
      </div>
    </div>
    <div class="hw-step-label" style="margin-top:11px;text-align:center;font-size:12px;font-weight:700;color:#33456A;">Citizen captures the issue</div>
  </div>

  <!-- STEP 2 : AI processing -->
  <div style="position:absolute;top:206px;left:262px;width:276px;transform:translateZ(85px);animation:hw-float-2 7s ease-in-out infinite .4s;">
    <div style="position:absolute;top:-13px;left:-13px;z-index:3;width:30px;height:30px;border-radius:50%;background:#003893;color:#fff;font-size:14px;font-weight:800;display:flex;align-items:center;justify-content:center;box-shadow:0 6px 14px -3px rgba(0,56,147,.6);">2</div>
    <div style="background:#fff;border:1px solid #E6ECF6;border-radius:18px;padding:16px;box-shadow:0 30px 54px -20px rgba(11,27,63,.45);">
      <div style="display:flex;align-items:center;gap:9px;margin-bottom:13px;">
        <div style="width:30px;height:30px;border-radius:9px;background:linear-gradient(135deg,#003893,#1D63C9);display:flex;align-items:center;justify-content:center;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1" stroke="#fff" stroke-width="2" stroke-linecap="round"></path><circle cx="12" cy="12" r="3.2" fill="#fff"></circle></svg>
        </div>
        <div>
          <div style="font-size:13.5px;font-weight:800;color:#0B1E3F;">AI Processing</div>
          <div style="font-size:10.5px;font-weight:600;color:#8294B4;">Analyzing your photo…</div>
        </div>
        <div style="margin-left:auto;font-size:10px;font-weight:800;color:#1E9E5A;background:#E5F6EC;padding:4px 9px;border-radius:6px;">LIVE</div>
      </div>
      <div style="position:relative;height:74px;border-radius:11px;overflow:hidden;margin-bottom:13px;background:linear-gradient(120deg,#24517F,#3C6A8E);">
        <div style="position:absolute;left:24px;bottom:0;width:5px;height:60px;background:#9FB0C9;"></div>
        <div style="position:absolute;left:18px;top:14px;width:38px;height:7px;background:#9FB0C9;border-radius:2px;"></div>
        <div style="position:absolute;left:0;right:0;top:6%;height:2px;background:linear-gradient(90deg,transparent,#56F0B0,transparent);box-shadow:0 0 10px #56F0B0;animation:hw-scan 2.4s ease-in-out infinite alternate;"></div>
        <div style="position:absolute;left:60px;top:24px;padding:2px 7px;background:rgba(86,240,176,.95);border-radius:5px;font-size:9px;font-weight:800;color:#063;letter-spacing:.3px;">Streetlight ✓</div>
      </div>
      <div style="display:flex;flex-direction:column;gap:9px;">
        <div style="display:flex;align-items:center;gap:9px;">
          <div style="width:20px;height:20px;border-radius:6px;background:#E5F6EC;display:flex;align-items:center;justify-content:center;"><svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="#1E9E5A" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"></path></svg></div>
          <div style="font-size:11.5px;font-weight:700;color:#33456A;">Issue detected</div>
          <div style="margin-left:auto;font-size:10.5px;font-weight:600;color:#8294B4;">Broken street light</div>
        </div>
        <div style="display:flex;align-items:center;gap:9px;">
          <div style="width:20px;height:20px;border-radius:6px;background:#E5F6EC;display:flex;align-items:center;justify-content:center;"><svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="#1E9E5A" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"></path></svg></div>
          <div style="font-size:11.5px;font-weight:700;color:#33456A;">Problem summary</div>
          <div style="margin-left:auto;font-size:10.5px;font-weight:600;color:#8294B4;">Auto-generated</div>
        </div>
        <div style="display:flex;align-items:center;gap:9px;">
          <div style="width:20px;height:20px;border-radius:6px;background:#EAF0FB;display:flex;align-items:center;justify-content:center;"><div style="width:9px;height:9px;border:2px solid #003893;border-top-color:transparent;border-radius:50%;animation:hwspin .8s linear infinite;"></div></div>
          <div style="font-size:11.5px;font-weight:700;color:#33456A;">Drafting Nibedan</div>
          <div style="margin-left:auto;font-size:10.5px;font-weight:700;color:#003893;">78%</div>
        </div>
        <div style="height:6px;border-radius:4px;background:#EAF0FB;overflow:hidden;"><div style="--w:78%;height:100%;border-radius:4px;background:linear-gradient(90deg,#003893,#2E7BE0);animation:hw-bar 2s ease-out forwards;"></div></div>
      </div>
    </div>
    <div class="hw-step-label" style="margin-top:11px;text-align:center;font-size:12px;font-weight:700;color:#33456A;">AI prepares the Nibedan</div>
  </div>

  <!-- STEP 3 : Nibedan document -->
  <div style="position:absolute;top:386px;left:8px;width:240px;transform:translateZ(70px);animation:hw-float 6.5s ease-in-out infinite .8s;">
    <div style="position:absolute;top:-13px;left:-13px;z-index:3;width:30px;height:30px;border-radius:50%;background:#DC143C;color:#fff;font-size:14px;font-weight:800;display:flex;align-items:center;justify-content:center;box-shadow:0 6px 14px -3px rgba(220,20,60,.6);">3</div>
    <div style="position:relative;background:#fff;border:1px solid #EAE2D4;border-radius:6px;padding:13px 15px 13px;box-shadow:0 30px 50px -20px rgba(26,54,93,.45);font-family:'Tiro Devanagari Sanskrit','Noto Sans Devanagari',serif;">
      <div style="position:absolute;top:0;left:0;right:0;height:4px;background:linear-gradient(90deg,#003893 50%,#DC143C 50%);border-radius:6px 6px 0 0;"></div>
      <div style="text-align:center;margin-bottom:7px;">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" style="display:block;margin:0 auto 2px;"><circle cx="12" cy="12" r="10" stroke="#1a365d" stroke-width="1.4"></circle><path d="M12 5.5l1.6 3.3 3.6.5-2.6 2.5.6 3.6L12 17.2 8.8 15l.6-3.6L6.8 8.8l3.6-.5L12 5.5z" fill="#DC143C"></path></svg>
        <div style="font-size:9.5px;font-weight:700;color:#1a365d;line-height:1;">नेपाल सरकार</div>
        <div style="font-family:'Public Sans',sans-serif;font-size:6px;font-weight:800;letter-spacing:1.4px;color:#A98F5E;text-transform:uppercase;margin-top:2px;">Government of Nepal</div>
        <div style="font-size:15px;font-weight:700;color:#0A2A66;line-height:1;margin-top:4px;">निवेदन</div>
      </div>
      <div style="height:1px;background:#EFE7D8;margin-bottom:7px;"></div>
      <div style="font-size:9px;color:#1a365d;line-height:1.45;">
        <div style="font-weight:700;">श्री वडा अध्यक्षज्यू,</div>
        <div style="font-size:8px;color:#5B6B85;">काठमाडौँ महानगरपालिका, वडा नं. ७</div>
      </div>
      <div style="margin:6px 0;padding:3px 7px;background:#F7F4EC;border-left:2px solid #DC143C;border-radius:0 3px 3px 0;font-size:8.5px;font-weight:700;color:#1a365d;">विषय : सडकबत्ती मर्मत सम्बन्धमा ।</div>
      <div style="font-size:8.5px;color:#1a365d;margin-bottom:4px;">महोदय,</div>
      <div style="display:flex;flex-direction:column;gap:4.5px;margin-bottom:9px;">
        <div style="height:5px;width:100%;background:#EEF1F6;border-radius:3px;"></div>
        <div style="height:5px;width:97%;background:#EEF1F6;border-radius:3px;"></div>
        <div style="height:5px;width:92%;background:#EEF1F6;border-radius:3px;"></div>
        <div style="height:5px;width:48%;background:#EEF1F6;border-radius:3px;"></div>
      </div>
      <div style="display:flex;align-items:flex-end;justify-content:space-between;">
        <div style="line-height:1.3;">
          <div style="font-size:8px;color:#5B6B85;">मिति : २०८१।०३।१७</div>
          <div style="font-size:7px;font-family:'Public Sans',sans-serif;font-weight:700;color:#8294B4;letter-spacing:.3px;text-transform:uppercase;margin-top:1px;">Date</div>
        </div>
        <div style="text-align:right;">
          <div style="font-style:italic;font-size:13px;color:#1C2F52;line-height:.9;">हस्ताक्षर</div>
          <div style="width:60px;height:1.5px;background:#33456A;margin:3px 0 2px auto;"></div>
          <div style="font-size:8px;font-weight:700;color:#1a365d;">निवेदक</div>
          <div style="font-size:6.5px;font-family:'Public Sans',sans-serif;font-weight:700;color:#8294B4;letter-spacing:.3px;text-transform:uppercase;">Applicant</div>
        </div>
        <div style="position:absolute;right:13px;bottom:13px;width:52px;height:52px;border-radius:50%;border:2px dashed #C8102E;display:flex;align-items:center;justify-content:center;transform:rotate(-12deg);background:rgba(255,255,255,.4);">
          <div style="position:absolute;inset:4px;border:1px solid #C8102E;border-radius:50%;"></div>
          <div style="text-align:center;color:#C8102E;line-height:1.05;">
            <div style="font-size:6px;font-weight:700;">वडा कार्यालय</div>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" style="margin:1px auto;"><path d="M12 2l2.4 4.9 5.4.8-3.9 3.8.9 5.4L12 19.3 7.2 17l.9-5.4L4.2 7.7l5.4-.8L12 2z" stroke="#C8102E" stroke-width="1.8" stroke-linejoin="round"></path></svg>
            <div style="font-size:6px;font-weight:700;">वडा नं. ७</div>
          </div>
        </div>
      </div>
    </div>
    <div class="hw-step-label" style="margin-top:11px;text-align:center;font-size:12px;font-weight:700;color:#33456A;">Official Nibedan generated</div>
  </div>

  <!-- STEP 4 : ward office dashboard -->
  <div style="position:absolute;top:382px;left:286px;width:288px;transform:translateZ(95px);animation:hw-float-2 7.5s ease-in-out infinite .2s;">
    <div style="position:absolute;top:-13px;left:-13px;z-index:3;width:30px;height:30px;border-radius:50%;background:#003893;color:#fff;font-size:14px;font-weight:800;display:flex;align-items:center;justify-content:center;box-shadow:0 6px 14px -3px rgba(0,56,147,.6);">4</div>
    <div style="background:#fff;border:1px solid #E6ECF6;border-radius:16px;overflow:hidden;box-shadow:0 32px 56px -20px rgba(11,27,63,.5);">
      <div style="display:flex;align-items:center;gap:9px;padding:13px 15px;background:linear-gradient(135deg,#1a365d,#062456);">
        <div style="width:26px;height:26px;border-radius:8px;background:rgba(255,255,255,.14);display:flex;align-items:center;justify-content:center;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M3 21V9l9-6 9 6v12M9 21v-6h6v6" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path></svg></div>
        <div>
          <div style="font-size:12.5px;font-weight:800;color:#fff;">Ward Office Dashboard</div>
          <div style="font-size:9.5px;font-weight:600;color:#A9BEE2;">Officer review &amp; action</div>
        </div>
        <div style="margin-left:auto;display:flex;align-items:center;gap:5px;background:rgba(255,255,255,.13);padding:4px 9px;border-radius:20px;"><span style="width:6px;height:6px;border-radius:50%;background:#56F0B0;"></span><span style="font-size:9.5px;font-weight:700;color:#D7E4F8;">3 new</span></div>
      </div>
      <div style="padding:13px 14px;display:flex;flex-direction:column;gap:9px;">
        <div style="display:flex;align-items:center;gap:10px;padding:10px;border:1px solid #EDF1F7;border-radius:11px;background:#FAFCFF;">
          <div style="width:34px;height:34px;border-radius:9px;background:#FFF1F3;display:flex;align-items:center;justify-content:center;font-size:15px;">💡</div>
          <div style="flex:1;min-width:0;">
            <div style="font-size:11.5px;font-weight:800;color:#1C2F52;">Broken street light</div>
            <div style="font-size:10px;font-weight:600;color:#8294B4;">Ward 7 · Tinkune · #NB-4821</div>
          </div>
          <span style="font-size:9.5px;font-weight:800;color:#C8102E;background:#FCE9ED;padding:4px 9px;border-radius:20px;">New</span>
        </div>
        <div style="display:flex;align-items:center;gap:10px;padding:10px;border:1px solid #EDF1F7;border-radius:11px;">
          <div style="width:34px;height:34px;border-radius:9px;background:#FFF7E8;display:flex;align-items:center;justify-content:center;font-size:15px;">🗑️</div>
          <div style="flex:1;min-width:0;">
            <div style="font-size:11.5px;font-weight:800;color:#1C2F52;">Waste not collected</div>
            <div style="font-size:10px;font-weight:600;color:#8294B4;">Ward 7 · Koteshwor · #NB-4820</div>
          </div>
          <span style="font-size:9.5px;font-weight:800;color:#B5781A;background:#FCF0DA;padding:4px 9px;border-radius:20px;">Review</span>
        </div>
        <div style="display:flex;align-items:center;gap:10px;padding:10px;border:1px solid #EDF1F7;border-radius:11px;">
          <div style="width:34px;height:34px;border-radius:9px;background:#EAF6FF;display:flex;align-items:center;justify-content:center;font-size:15px;">🛣️</div>
          <div style="flex:1;min-width:0;">
            <div style="font-size:11.5px;font-weight:800;color:#1C2F52;">Damaged road surface</div>
            <div style="font-size:10px;font-weight:600;color:#8294B4;">Ward 7 · Sinamangal · #NB-4814</div>
          </div>
          <span style="font-size:9.5px;font-weight:800;color:#1E9E5A;background:#E5F6EC;padding:4px 9px;border-radius:20px;">Resolved</span>
        </div>
      </div>
    </div>
    <div class="hw-step-label" style="margin-top:11px;text-align:center;font-size:12px;font-weight:700;color:#33456A;">Ward officer receives &amp; acts</div>
  </div>

</div>
</div>
`;

export default function HeroWorkflow() {
  const colRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const col = colRef.current;
    if (!col) return;
    const scaler = col.querySelector<HTMLElement>('[data-hw-scaler]');
    if (!scaler) return;

    const fit = () => {
      const avail = col.clientWidth;
      const s = Math.min(1, Math.max(0.5, avail / 600));
      scaler.style.transform = `translate(-50%,-50%) scale(${s})`;
      col.style.height = `${640 * s}px`;
    };

    fit();
    const raf = requestAnimationFrame(fit);
    const ro = new ResizeObserver(fit);
    ro.observe(col.parentElement ?? col);
    window.addEventListener('resize', fit);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener('resize', fit);
    };
  }, []);

  return (
    <div
      ref={colRef}
      aria-hidden="true"
      style={{ position: 'relative', height: 640, minWidth: 0, overflow: 'visible' }}
      dangerouslySetInnerHTML={{ __html: ART }}
    />
  );
}
