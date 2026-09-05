import { useState, useEffect, useCallback } from "react"

import { userDoc } from '../lib/db'
import { supabase } from '../lib/supabase'
const userDoc_safe      = (uid, updates) => userDoc.update(uid, updates).catch(e => console.warn('save:', e.message))
const userDoc_subscribe = (uid, cb) => userDoc.subscribe(uid, cb)

// ─── Real data hooks (replaces the previous Firestore doc()/updateDoc() calls,
// which referenced functions never imported into this Supabase app and threw
// ReferenceError on every Follow / Create Post / Booking Request click) ─────

function useProfilePosts(profileUid) {
  const [posts, setPosts]     = useState([])
  const [loading, setLoading] = useState(true)
  const load = useCallback(async () => {
    if (!profileUid) { setLoading(false); return }
    setLoading(true)
    const { data } = await supabase
      .from("org_events").select("*").eq("org_id", profileUid).eq("type", "post")
      .order("created_at", { ascending: false })
    setPosts(data || [])
    setLoading(false)
  }, [profileUid])
  useEffect(() => { load() }, [load])
  return { posts, loading, reload: load }
}

function useFollowState(profileUid, viewerUid) {
  const [isFollowing, setIsFollowing]     = useState(false)
  const [followerCount, setFollowerCount] = useState(0)
  const load = useCallback(async () => {
    if (!profileUid) return
    const { count } = await supabase
      .from("follows").select("id", { count: "exact", head: true }).eq("following_id", profileUid)
    setFollowerCount(count || 0)
    if (viewerUid && viewerUid !== profileUid) {
      const { data } = await supabase
        .from("follows").select("id").eq("follower_id", viewerUid).eq("following_id", profileUid).maybeSingle()
      setIsFollowing(!!data)
    }
  }, [profileUid, viewerUid])
  useEffect(() => { load() }, [load])

  const toggleFollow = async () => {
    if (!viewerUid || viewerUid === profileUid) return
    if (isFollowing) {
      await supabase.from("follows").delete().eq("follower_id", viewerUid).eq("following_id", profileUid)
      setIsFollowing(false); setFollowerCount(c => Math.max(0, c - 1))
    } else {
      await supabase.from("follows").insert({ follower_id: viewerUid, following_id: profileUid })
      setIsFollowing(true); setFollowerCount(c => c + 1)
    }
  }

  return { isFollowing, followerCount, toggleFollow }
}

// ─── DESIGN TOKENS (matches Aura.jsx) ────────────────────────────────────────
const T = {
  cream:"#F6F6F1", cream2:"#EFEFE9", cream3:"#E8E8E1",
  ink:"#1A1A18", ink2:"#3A3A38", ink3:"#6B6B68", ink4:"#9A9A97",
  indigo:"#3D4EAC", indigo2:"#5B6FD4", indigo3:"#EEF0FB",
  green:"#1A7A4A", green2:"#E8F7EF",
  amber:"#B8620A", amber2:"#FDF3E7",
  red:"#C0392B", red2:"#FDECEA",
  blue:"#1565C0", blue2:"#E8F1FB",
  gold:"#C9A84C", gold2:"#FDF8EC",
  purple:"#6D28D9", purple2:"#EDE9FE",
  border:"rgba(26,26,24,0.09)",
  shadow:"0 2px 12px rgba(26,26,24,0.07), 0 1px 3px rgba(26,26,24,0.05)",
  shadow2:"0 8px 24px rgba(0,0,0,0.08), 0 2px 8px rgba(26,26,24,0.06)",
}

// ─── UTILITY COMPONENTS ──────────────────────────────────────────────────────
function Badge({ children, color=T.indigo, bg=T.indigo3 }) {
  return <span style={{display:"inline-flex",alignItems:"center",gap:4,padding:"3px 10px",background:bg,color,fontSize:11,fontWeight:700,borderRadius:99,letterSpacing:0.3}}>{children}</span>
}
function Card({ children, style={} }) {
  return <div style={{background:"#FFFFFF",border:`1px solid ${T.border}`,borderRadius:16,boxShadow:T.shadow,padding:"22px 24px",...style}}>{children}</div>
}
function SL({ children, color=T.indigo }) {
  return <div style={{fontSize:10,fontWeight:800,letterSpacing:2.5,color,textTransform:"uppercase",marginBottom:4,display:"flex",alignItems:"center",gap:6}}>{children}</div>
}

// ─── PROFILE TRACK / VERIFICATION HELPERS (unchanged logic) ──────────────────
function getProfileTrack(userData={}) {
  const accountType=(userData.accountType||"").toLowerCase()
  const authorityType=(userData.authorityType||"").toLowerCase()
  if(accountType==="institution") return "org"
  if(accountType==="executive") return "org"
  if(["university","college","bootcamp","company","ngo","institution"].includes(authorityType)) return "org"
  return "leader"
}

function getVerificationMeta(userData={}) {
  const verificationType=userData.verificationType||userData.verificationStatus||"none"
  const mentorVerificationStatus=userData.mentorVerificationStatus||userData.mentorVerification||"none"
  const mentorTrustScore=Number(userData.mentorTrustScore||0)
  const accountType=(userData.accountType||"").toLowerCase()
  const authorityType=userData.authorityType||"Authority"
  const profileTrack=getProfileTrack(userData)
  const isOrg=profileTrack==="org"
  const isExecutive=accountType==="executive"||(!isOrg&&authorityType!=="Professor/Researcher"&&authorityType!=="Industry Expert"&&authorityType!=="Mentor")
  const isInstitution=accountType==="institution"||["University","College","Bootcamp","Company","NGO","Institution"].includes(authorityType)
  const normalized=verificationType==="verifiedAuthority"?"manual_review":verificationType==="verified"?"manual_review":verificationType==="pending"?"none":verificationType
  const labelMap={none:"Unverified",email_verified:"Email Verified",domain_verified:"Domain Verified",manual_review:"Identity Reviewed",premium_verified:"Premium Verified"}
  const verified=normalized==="manual_review"||normalized==="premium_verified"||normalized==="domain_verified"
  const mentorVerified=mentorVerificationStatus==="approved"||mentorVerificationStatus==="mentor_verified"
  return {accountType,authorityType,profileTrack,isOrg,isExecutive,isInstitution,verificationType:normalized,verificationLabel:labelMap[normalized]||"Verification In Review",verified,mentorVerified,mentorVerificationStatus,mentorTrustScore}
}

// ─── VERIFIED BADGE ───────────────────────────────────────────────────────────
function VerifiedBadge({ userData }) {
  const meta=getVerificationMeta(userData)
  if(meta.isInstitution) {
    return meta.verified
      ? <Badge color={T.green} bg={T.green2}>✦ Institution Verified</Badge>
      : <Badge color={T.amber} bg={T.amber2}>◎ Verification Pending</Badge>
  }
  if(meta.mentorVerified) return <Badge color={T.blue} bg={T.blue2}>✦ Mentor Verified</Badge>
  if(meta.verified) return <Badge color={T.green} bg={T.green2}>✦ {meta.verificationLabel}</Badge>
  return <Badge color={T.amber} bg={T.amber2}>◎ {meta.verificationLabel}</Badge>
}

// ─── POST CARD ────────────────────────────────────────────────────────────────
function PostCard({ post }) {
  // post is a real org_events row: category (was "type"), description (was
  // "content"), created_at (was "createdAt"). No tags column exists on
  // org_events, so the old post.tags rendering is dropped rather than faked.
  const typeColors={knowledge:T.indigo,journey:T.purple,lesson:T.amber,challenge:T.green,announcement:T.amber,resource:T.blue}
  const typeLabels={knowledge:"💡 Knowledge",journey:"🚀 Journey",lesson:"📚 Lesson",challenge:"⚔️ Challenge",announcement:"📢 Announcement",resource:"🧩 Resource"}
  const col=typeColors[post.category]||T.indigo
  const lbl=typeLabels[post.category]||"💡 Knowledge"
  return (
    <Card style={{marginBottom:12}}>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12,flexWrap:"wrap"}}>
        <Badge color={col} bg={col+"15"}>{lbl}</Badge>
        <span style={{fontSize:11,color:T.ink4,marginLeft:"auto"}}>{new Date(post.created_at).toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"})}</span>
      </div>
      <h3 style={{fontSize:16,fontWeight:800,color:T.ink,marginBottom:8,lineHeight:1.4}}>{post.title}</h3>
      <p style={{fontSize:13,color:T.ink2,lineHeight:1.75,margin:"0 0 12px"}}>{post.description}</p>
    </Card>
  )
}

// ─── CREATE POST MODAL ────────────────────────────────────────────────────────
function CreatePostModal({ onClose, onPost, authorityType }) {
  const isInstitution=["University","College","Bootcamp","Company","NGO"].includes(authorityType)
  const [type, setType] = useState(isInstitution?"announcement":"knowledge")
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [tags, setTags] = useState("")
  const [posting, setPosting] = useState(false)

  const POST_TYPES = isInstitution
    ? [{id:"announcement",icon:"📢",label:"Announcement"},{id:"resource",icon:"🧩",label:"Resource"},{id:"lesson",icon:"📚",label:"Lesson"},{id:"challenge",icon:"⚔️",label:"Challenge"}]
    : [{id:"knowledge",icon:"💡",label:"Knowledge"},{id:"journey",icon:"🚀",label:"Journey"},{id:"lesson",icon:"📚",label:"Lesson"},{id:"challenge",icon:"⚔️",label:"Challenge"}]

  const inp={width:"100%",padding:"10px 14px",background:T.cream,border:`1.5px solid ${T.border}`,borderRadius:10,color:T.ink,fontSize:13,fontFamily:"'DM Sans',sans-serif",outline:"none",boxSizing:"border-box"}

  const handlePost=async()=>{
    if(!title.trim()||!content.trim()) return
    setPosting(true)
    await onPost({type,title:title.trim(),content:content.trim(),tags:tags.split(",").map(t=>t.trim()).filter(Boolean),createdAt:new Date().toISOString(),likes:0,views:0})
    setPosting(false); onClose()
  }

  return (
    <div style={{position:"fixed",inset:0,zIndex:9999,background:"rgba(26,26,24,0.5)",backdropFilter:"blur(10px)",display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div style={{width:"100%",maxWidth:560,background:"#FFFFFF",border:`1px solid ${T.border}`,borderRadius:24,overflow:"hidden",maxHeight:"90vh",display:"flex",flexDirection:"column",boxShadow:T.shadow2}}>
        <div style={{padding:"20px 24px",borderBottom:`1px solid ${T.border}`,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div style={{fontSize:16,fontWeight:800,color:T.ink}}>✦ Create Post</div>
          <button onClick={onClose} style={{background:"none",border:"none",color:T.ink4,fontSize:20,cursor:"pointer"}}>×</button>
        </div>
        <div style={{flex:1,overflowY:"auto",padding:"20px 24px"}}>
          <div style={{display:"flex",gap:8,marginBottom:16,flexWrap:"wrap"}}>
            {POST_TYPES.map(pt=>(
              <button key={pt.id} onClick={()=>setType(pt.id)}
                style={{padding:"7px 14px",borderRadius:20,border:`1.5px solid ${type===pt.id?"rgba(61,78,172,0.4)":T.border}`,background:type===pt.id?T.indigo3:"transparent",color:type===pt.id?T.indigo:T.ink3,fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}>
                {pt.icon} {pt.label}
              </button>
            ))}
          </div>
          <input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Title..." style={{...inp,fontSize:15,fontWeight:700,marginBottom:12}}/>
          <textarea value={content} onChange={e=>setContent(e.target.value)} rows={6} placeholder="Share your insight, announcement, or challenge..." style={{...inp,resize:"vertical",lineHeight:1.7,marginBottom:12}}/>
          <input value={tags} onChange={e=>setTags(e.target.value)} placeholder="Tags (comma separated): startup, hiring, ai..." style={inp}/>
        </div>
        <div style={{padding:"16px 24px",borderTop:`1px solid ${T.border}`}}>
          <button onClick={handlePost} disabled={!title.trim()||!content.trim()||posting}
            style={{width:"100%",padding:"14px",background:title.trim()&&content.trim()?T.indigo:T.cream2,border:"none",borderRadius:12,color:title.trim()&&content.trim()?"#fff":T.ink4,fontSize:14,fontWeight:800,cursor:title.trim()&&content.trim()?"pointer":"not-allowed",fontFamily:"'DM Sans',sans-serif"}}>
            {posting?"Publishing...":"✦ Publish Post"}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── BOOKING MODAL ────────────────────────────────────────────────────────────
function BookingModal({ type, authorName, authorUid, requesterUid, requesterName, onClose }) {
  const [msg, setMsg] = useState("")
  const [sent, setSent] = useState(false)
  const [sending, setSending] = useState(false)
  const typeConfig={
    mentorship:{icon:"🎓",title:"Request Mentorship",placeholder:"What do you want to learn? Your current level and specific needs?"},
    advisory:{icon:"💡",title:"Request Advisory",placeholder:"Describe your project and what advice you need."},
    hiring:{icon:"💼",title:"Express Hiring Interest",placeholder:"Introduce yourself and mention the role you are reaching out for."},
    consulting:{icon:"🤝",title:"Request Consulting",placeholder:"Describe the problem, expected outcome, and timeline."},
  }
  const t=typeConfig[type]||typeConfig.mentorship
  const inp={width:"100%",padding:"10px 14px",background:T.cream,border:`1.5px solid ${T.border}`,borderRadius:10,color:T.ink,fontSize:13,fontFamily:"'DM Sans',sans-serif",outline:"none",boxSizing:"border-box"}

  const handleSend=async()=>{
    if(!msg.trim()||sending) return
    setSending(true)
    try {
      // Real request, via the connections table (no bookings table exists yet —
      // per FUNDING_HUB_DESIGN_SPEC.md's "never fabricate a table that isn't
      // there" rule, this rides on the real connections/request primitive
      // rather than writing to a Firestore array that was never real).
      const { error } = await supabase.from("connections").insert({
        requester_id: requesterUid,
        addressee_id: authorUid,
        status: "pending",
        message: `[${type}] ${msg.trim()}`,
      })
      if (error) throw error
      setSent(true)
    } catch(e){console.error("Booking error:",e.message)}
    setSending(false)
  }

  return (
    <div style={{position:"fixed",inset:0,zIndex:9999,background:"rgba(26,26,24,0.5)",backdropFilter:"blur(10px)",display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      <div style={{width:"100%",maxWidth:460,background:"#FFFFFF",border:`1px solid ${T.border}`,borderRadius:24,overflow:"hidden",boxShadow:T.shadow2}}>
        <div style={{padding:"20px 24px",borderBottom:`1px solid ${T.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <div style={{fontSize:24,marginBottom:4}}>{t.icon}</div>
            <div style={{fontSize:16,fontWeight:800,color:T.ink}}>{t.title}</div>
            <div style={{fontSize:12,color:T.ink4,marginTop:2}}>with {authorName}</div>
          </div>
          <button onClick={onClose} style={{background:"none",border:"none",color:T.ink4,fontSize:20,cursor:"pointer"}}>×</button>
        </div>
        <div style={{padding:"20px 24px"}}>
          {sent ? (
            <div style={{textAlign:"center",padding:"20px 0"}}>
              <div style={{fontSize:48,marginBottom:12}}>🎉</div>
              <div style={{fontSize:16,fontWeight:800,color:T.green,marginBottom:8}}>Request Sent!</div>
              <div style={{fontSize:13,color:T.ink3,lineHeight:1.6,marginBottom:20}}>{authorName} will review and respond. You will be notified when they reply.</div>
              <button onClick={onClose} style={{padding:"11px 24px",background:T.cream2,border:`1px solid ${T.border}`,borderRadius:10,color:T.ink3,fontSize:13,fontWeight:600,cursor:"pointer"}}>Close</button>
            </div>
          ) : (
            <>
              <textarea value={msg} onChange={e=>setMsg(e.target.value)} placeholder={t.placeholder} rows={5} style={{...inp,resize:"vertical",lineHeight:1.7,marginBottom:16}}/>
              <button onClick={handleSend} disabled={!msg.trim()||sending}
                style={{width:"100%",padding:"14px",background:msg.trim()?T.indigo:T.cream2,border:"none",borderRadius:12,color:msg.trim()?"#fff":T.ink4,fontSize:14,fontWeight:800,cursor:msg.trim()?"pointer":"not-allowed",fontFamily:"'DM Sans',sans-serif"}}>
                {sending?"Sending...":"Send Request →"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── VERIFICATION MODAL ───────────────────────────────────────────────────────
function VerificationModal({ onClose, authorityType, userData }) {
  const meta=getVerificationMeta(userData)
  const isInstitution=meta.isInstitution
  const isMentor=authorityType==="Mentor"||authorityType==="Professor/Researcher"||meta.mentorTrustScore>0
  const requirements=isInstitution
    ?[{icon:"✉️",text:"Verify with official institutional or work email"},{icon:"🌐",text:"Add institution/company website and domain"},{icon:"🏢",text:"Complete organization/domain verification"},{icon:"🛡️",text:"Enable delegated admin and organization trust setup"}]
    :isMentor
    ?[{icon:"✉️",text:"Verify work/institutional email"},{icon:"🌐",text:"Add public links or work proof"},{icon:"🧾",text:"Pass manual mentor review before paid sessions go live"},{icon:"📈",text:"Build mentor trust score through session quality"}]
    :[{icon:"✉️",text:"Verify with your work email"},{icon:"🌐",text:"Add company website or professional links"},{icon:"🧾",text:"Pass identity/manual review for title and role proof"},{icon:"🎓",text:"Apply for mentor verification if you want sessions/monetization"}]

  return (
    <div style={{position:"fixed",inset:0,zIndex:9999,background:"rgba(26,26,24,0.5)",backdropFilter:"blur(10px)",display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      <div style={{width:"100%",maxWidth:500,background:"#FFFFFF",border:`1px solid ${T.border}`,borderRadius:24,overflow:"hidden",boxShadow:T.shadow2}}>
        <div style={{padding:"24px 24px 20px",borderBottom:`1px solid ${T.border}`,background:`linear-gradient(135deg,${T.indigo3},${T.cream})`}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
            <div style={{fontSize:32}}>🏆</div>
            <button onClick={onClose} style={{background:"none",border:"none",color:T.ink4,fontSize:20,cursor:"pointer"}}>×</button>
          </div>
          <h2 style={{fontSize:20,fontWeight:900,color:T.ink,marginBottom:6}}>{isInstitution?"Institution Verification":isMentor?"Mentor Verification":"Professional Verification"}</h2>
          <p style={{fontSize:13,color:T.ink3,lineHeight:1.6,margin:0}}>{isInstitution?"Institution verification is domain and organization based — not challenge performance.":isMentor?"Mentors should be verified through identity, work proof, manual review, and trust score.":"Executive verification should be identity and trust based. Arena can show optional proof of expertise."}</p>
        </div>
        <div style={{padding:"20px 24px"}}>
          <SL color={T.indigo}>Requirements</SL>
          <div style={{marginTop:12,marginBottom:16}}>
            {requirements.map((r,i)=>(
              <div key={i} style={{display:"flex",gap:12,alignItems:"flex-start",marginBottom:10,padding:"12px 14px",background:T.cream,border:`1px solid ${T.border}`,borderRadius:12}}>
                <span style={{fontSize:20,flexShrink:0}}>{r.icon}</span>
                <span style={{fontSize:13,color:T.ink2,lineHeight:1.5}}>{r.text}</span>
              </div>
            ))}
          </div>
          <div style={{background:T.indigo3,border:`1px solid rgba(61,78,172,0.2)`,borderRadius:12,padding:"12px 16px",marginBottom:20}}>
            <SL color={T.indigo}>Why this matters</SL>
            <div style={{fontSize:12,color:T.ink3,lineHeight:1.7,marginTop:6}}>Identity verification proves who you are. Domain verification proves where you belong. <strong style={{color:T.green}}>Mentor verification proves you can be trusted with guidance.</strong></div>
          </div>
          <div style={{display:"flex",gap:10}}>
            <button onClick={onClose} style={{flex:1,padding:"12px",background:T.cream2,border:`1px solid ${T.border}`,borderRadius:12,color:T.ink3,fontSize:13,fontWeight:600,cursor:"pointer"}}>Later</button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── TRUST METER ──────────────────────────────────────────────────────────────
function TrustMeter({ score=0 }) {
  const safe=Math.max(0,Math.min(100,Number(score||0)))
  const col=safe>=80?T.green:safe>=60?T.indigo:safe>=40?T.amber:T.red
  return (
    <Card style={{marginBottom:16}}>
      <SL color={T.indigo}>Mentor Trust Score</SL>
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:8,marginTop:10}}>
        <span style={{fontSize:13,color:T.ink,fontWeight:700}}>Trust readiness</span>
        <span style={{fontSize:14,color:col,fontWeight:900}}>{safe}/100</span>
      </div>
      <div style={{height:8,background:T.cream3,borderRadius:99,overflow:"hidden"}}>
        <div style={{height:"100%",width:`${safe}%`,background:col,borderRadius:99,transition:"width 0.8s ease"}}/>
      </div>
      <div style={{fontSize:12,color:T.ink4,lineHeight:1.65,marginTop:10}}>Trust combines identity verification, profile completeness, public work proof, manual review, and session quality.</div>
    </Card>
  )
}

// ─── STAT PILL ────────────────────────────────────────────────────────────────
function StatPill({ icon, value, label }) {
  return (
    <div style={{textAlign:"center",padding:"0 16px"}}>
      <div style={{fontSize:20,fontWeight:900,color:T.ink}}>{value}</div>
      <div style={{fontSize:10,color:T.ink4,fontWeight:600,marginTop:2,textTransform:"uppercase",letterSpacing:1}}>{icon} {label}</div>
    </div>
  )
}

// ─── SKILL BAR ────────────────────────────────────────────────────────────────
function SkillBar({ label, value, color }) {
  return (
    <div style={{marginBottom:14}}>
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
        <span style={{fontSize:13,color:T.ink2,fontWeight:600}}>{label}</span>
        <span style={{fontSize:13,fontWeight:800,color}}>{value}%</span>
      </div>
      <div style={{height:6,background:T.cream3,borderRadius:99,overflow:"hidden"}}>
        <div style={{height:"100%",width:`${value}%`,background:color,borderRadius:99,transition:"width 1s ease"}}/>
      </div>
    </div>
  )
}

const SKILL_COLORS = ["#3D4EAC","#1A7A4A","#E67E22","#8E44AD","#E74C3C","#16A085","#2980B9","#C0392B"]

// ─── MAIN AUTHORITY PROFILE ───────────────────────────────────────────────────
export default function AuthorityProfile({ user, userData, setUserData, onNavigate }) {
  const viewerUid = user?.id || user?.uid
  const profileUid = userData?.uid || userData?.id
  const { posts, reload: reloadPosts }        = useProfilePosts(profileUid)
  const { isFollowing, followerCount, toggleFollow } = useFollowState(profileUid, viewerUid)
  const [showVerifyModal, setShowVerifyModal] = useState(false)
  const [bookingType, setBookingType]   = useState(null)
  const [activeTab, setActiveTab]       = useState("posts")
  const [showCreate, setShowCreate]     = useState(false)

  const isOwner = viewerUid && profileUid === viewerUid
  const authorityType = userData?.authorityType||"Authority"
  const domain = userData?.keyword||userData?.domain||""
  const openTo = userData?.openTo||{}
  const eloRating = userData?.eloRating||0
  const skills = userData?.skillGraph||[]
  const arenaCompleted = userData?.arenaCompleted||0
  const meta = getVerificationMeta(userData)
  const showElo = !meta.isInstitution&&(meta.profileTrack!=="org"||authorityType==="Professor/Researcher"||authorityType==="Industry Expert")
  const primaryVerificationCTA = !meta.verified||(openTo.mentorship&&!meta.mentorVerified)

  const handleFollow = toggleFollow

  const handlePost = async (postData) => {
    if(!viewerUid) return
    // Real write to org_events — the same table/pattern already backing
    // ExecutiveHome's Executive Feed and InstitutionOS's Community posts,
    // rather than a Firestore users/{uid}.posts array that was never real.
    const { error } = await supabase.from("org_events").insert({
      org_id: viewerUid,
      type: "post",
      category: postData.type,
      title: postData.title,
      description: postData.content,
      created_by: viewerUid,
    })
    if (error) { console.error("Post error:", error.message); return }
    await reloadPosts()
  }

  const TABS = [
    {id:"posts",label:"Posts",count:posts.length},
    {id:"about",label:"About",count:null},
    {id:"skills",label:meta.isInstitution?"Signals":"Skills",count:skills.length},
  ]

  return (
    <div style={{flex:1,minHeight:0,overflowY:"auto",background:T.cream,color:T.ink,fontFamily:"'DM Sans',sans-serif",paddingTop:0}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800;900&family=DM+Mono:wght@400;500&display=swap');
        *{box-sizing:border-box}
        ::-webkit-scrollbar{width:4px}
        ::-webkit-scrollbar-thumb{background:rgba(61,78,172,0.2);border-radius:10px}
        @keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
      `}</style>

      {bookingType&&<BookingModal type={bookingType} authorName={userData?.displayName||userData?.name||"Authority"} authorUid={profileUid||""} requesterUid={viewerUid||""} requesterName={user?.displayName||"User"} onClose={()=>setBookingType(null)}/>}
      {showVerifyModal&&<VerificationModal onClose={()=>setShowVerifyModal(false)} authorityType={authorityType} userData={userData}/>}
      {showCreate&&<CreatePostModal onClose={()=>setShowCreate(false)} onPost={handlePost} authorityType={authorityType}/>}

      {/* Cover Banner */}
      <div style={{height:200,background:"linear-gradient(135deg,#3D4EAC 0%,#5B6FD4 40%,#7C8EF0 70%,#B8C4FF 100%)",position:"relative",overflow:"hidden"}}>
        <svg style={{position:"absolute",inset:0,width:"100%",height:"100%",opacity:0.08}} viewBox="0 0 800 200">
          {[...Array(12)].map((_,i)=><circle key={i} cx={i*80+20} cy={100} r={50+i*8} fill="none" stroke="#fff" strokeWidth="0.5"/>)}
        </svg>
        <div style={{position:"absolute",top:16,right:20,display:"flex",gap:8}}>
          <span style={{background:"rgba(0,0,0,0.08)",backdropFilter:"blur(8px)",border:"1px solid rgba(255,255,255,0.3)",borderRadius:20,padding:"5px 14px",fontSize:11,fontWeight:700,color:"#fff"}}>{domain||meta.verificationLabel}</span>
          {isOwner&&<span style={{background:"rgba(0,0,0,0.08)",backdropFilter:"blur(8px)",border:"1px solid rgba(255,255,255,0.3)",borderRadius:20,padding:"5px 14px",fontSize:11,fontWeight:700,color:"#fff"}}>{authorityType}</span>}
        </div>
      </div>

      <div style={{maxWidth:820,margin:"0 auto",padding:"0 24px 80px",position:"relative"}}>
        {/* Profile Header Row */}
        <div style={{display:"flex",alignItems:"flex-end",gap:20,marginTop:-48,marginBottom:24,flexWrap:"wrap"}}>
          <div style={{width:96,height:96,borderRadius:24,background:"linear-gradient(135deg,#3D4EAC,#5B6FD4)",border:"4px solid #fff",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:42,fontWeight:900,color:"#fff",boxShadow:"0 8px 24px rgba(61,78,172,0.3)"}}>
            {(userData?.displayName||"A")[0].toUpperCase()}
          </div>
          <div style={{flex:1,paddingBottom:8}}>
            <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap",marginBottom:6}}>
              <h1 style={{fontSize:26,fontWeight:900,color:T.ink,letterSpacing:-0.5,margin:0}}>{userData?.displayName||"Authority User"}</h1>
              <VerifiedBadge userData={userData}/>
              {meta.mentorVerified&&<Badge color={T.green} bg={T.green2}>✦ Mentor Verified</Badge>}
            </div>
            <div style={{fontSize:14,color:T.ink3,marginBottom:8}}>{userData?.role||authorityType}{userData?.company&&<span style={{color:T.ink4}}> · {userData.company}</span>}</div>
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              <Badge color={T.indigo} bg={T.indigo3}>{authorityType}</Badge>
              <Badge color={T.ink3} bg={T.cream2}>{meta.profileTrack==="org"?"Org Track":"Leader Track"}</Badge>
            </div>
          </div>
          <div style={{display:"flex",gap:10,paddingBottom:8,flexWrap:"wrap"}}>
            {isOwner ? (
              <button onClick={()=>setShowCreate(true)} style={{padding:"10px 20px",background:T.indigo,border:"none",borderRadius:12,color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer"}}>✦ Create Post</button>
            ) : (
              <>
                <button onClick={handleFollow} style={{padding:"10px 20px",background:isFollowing?T.cream2:T.indigo,border:isFollowing?`1px solid ${T.border}`:"none",borderRadius:12,color:isFollowing?T.ink3:"#fff",fontSize:13,fontWeight:700,cursor:"pointer"}}>
                  {isFollowing?"✓ Following":"+ Follow"}
                </button>
                <button style={{padding:"10px 20px",background:T.cream2,border:`1px solid ${T.border}`,borderRadius:12,color:T.ink3,fontSize:13,fontWeight:700,cursor:"pointer"}}>Message</button>
              </>
            )}
          </div>
        </div>

        {/* Stats Strip */}
        <Card style={{marginBottom:20,padding:"16px 0",display:"flex",justifyContent:"space-around",flexWrap:"wrap",rowGap:12}}>
          <StatPill icon="👥" value={followerCount} label="Followers"/>
          <div style={{width:1,background:T.border}}/>
          <StatPill icon="📝" value={posts.length} label="Posts"/>
          <div style={{width:1,background:T.border}}/>
          <StatPill icon="🛡️" value={meta.verificationLabel} label="Status"/>
          <div style={{width:1,background:T.border}}/>
          <StatPill icon={showElo?"⚡":"🏢"} value={showElo?eloRating:(userData?.organizationSize||"Org")} label={showElo?"ELO":"Tenant"}/>
        </Card>

        {/* Verification CTA */}
        {isOwner&&primaryVerificationCTA&&(
          <Card style={{marginBottom:16,background:`linear-gradient(135deg,${T.indigo3},${T.cream})`,border:`1.5px solid rgba(61,78,172,0.2)`,display:"flex",alignItems:"center",gap:14,flexWrap:"wrap"}}>
            <div style={{fontSize:28,flexShrink:0}}>🏆</div>
            <div style={{flex:1}}>
              <div style={{fontSize:13,fontWeight:800,color:T.ink,marginBottom:3}}>
                {meta.isInstitution?"Complete institution verification":openTo.mentorship&&!meta.mentorVerified?"Unlock mentor verification":"Complete professional verification"}
              </div>
              <div style={{fontSize:11,color:T.ink3,lineHeight:1.5}}>
                {meta.isInstitution?"Verify domain, organization identity, and admin trust.":openTo.mentorship&&!meta.mentorVerified?"Mentorship and monetization gated by mentor review and trust score.":"Work email, role proof, domain/public links, and identity review drive verification."}
              </div>
            </div>
            <button onClick={()=>setShowVerifyModal(true)} style={{padding:"10px 18px",background:T.indigo,border:"none",borderRadius:10,color:"#fff",fontSize:12,fontWeight:800,cursor:"pointer",flexShrink:0}}>Review →</button>
          </Card>
        )}

        {/* Trust Meter */}
        {openTo.mentorship&&<TrustMeter score={userData?.mentorTrustScore||0}/>}

        {/* Open To */}
        <div style={{display:"flex",gap:8,marginBottom:20,flexWrap:"wrap",alignItems:"center"}}>
          <span style={{fontSize:11,color:T.ink4,fontWeight:700}}>Open to:</span>
          {Object.entries({mentorship:"Mentorship",advisory:"Advisory",hiring:"Hiring",consulting:"Consulting"}).map(([k,label])=>{
            const isOn=openTo[k]
            if(isOwner){
              return (
                <button key={k} onClick={async()=>{const no={...openTo,[k]:!isOn};await userDoc_safe(user.id||user.uid,{openTo:no});if(setUserData)setUserData(d=>({...d,openTo:no}))}}
                  style={{fontSize:11,background:isOn?T.indigo3:T.cream2,border:`1.5px solid ${isOn?"rgba(61,78,172,0.3)":T.border}`,borderRadius:20,padding:"5px 14px",color:isOn?T.indigo:T.ink4,fontWeight:700,cursor:"pointer",transition:"all 0.2s"}}>
                  {isOn?"✓ ":""}{label}
                </button>
              )
            }
            if(!isOn) return null
            return (
              <button key={k} onClick={()=>setBookingType(k)}
                style={{fontSize:11,background:T.indigo3,border:`1.5px solid rgba(61,78,172,0.25)`,borderRadius:20,padding:"5px 14px",color:T.indigo,fontWeight:700,cursor:"pointer"}}>
                {label} →
              </button>
            )
          })}
        </div>

        {/* Tab Bar */}
        <div style={{display:"flex",gap:4,marginBottom:20,background:T.cream2,borderRadius:12,padding:4}}>
          {TABS.map(tab=>(
            <button key={tab.id} onClick={()=>setActiveTab(tab.id)}
              style={{flex:1,padding:"10px 8px",borderRadius:9,border:"none",cursor:"pointer",background:activeTab===tab.id?"#fff":T.cream2,color:activeTab===tab.id?T.indigo:T.ink4,fontSize:13,fontWeight:700,boxShadow:activeTab===tab.id?T.shadow:"none",transition:"all 0.2s",borderBottom:activeTab===tab.id?`2px solid ${T.indigo}`:"2px solid transparent"}}>
              {tab.label}{tab.count!=null?` (${tab.count})`:""}
            </button>
          ))}
        </div>

        {/* POSTS TAB */}
        {activeTab==="posts"&&(
          <div style={{animation:"fadeUp 0.3s ease both"}}>
            {isOwner&&(
              <button onClick={()=>setShowCreate(true)} style={{width:"100%",padding:16,background:"#FFFFFF",border:`2px dashed rgba(61,78,172,0.25)`,borderRadius:16,color:"rgba(61,78,172,0.5)",fontSize:14,fontWeight:700,cursor:"pointer",marginBottom:16,transition:"all 0.2s"}}>
                ✦ Share a knowledge drop, announcement, lesson, or challenge...
              </button>
            )}
            {posts.length===0 ? (
              <div style={{textAlign:"center",padding:"60px 0",color:T.ink4}}>
                <div style={{fontSize:48,marginBottom:12}}>✦</div>
                <div style={{fontSize:16,fontWeight:700,color:T.ink3,marginBottom:8}}>No posts yet</div>
                <div style={{fontSize:13}}>{isOwner?"Share your first knowledge drop, announcement, or challenge.":"This profile has not posted yet."}</div>
              </div>
            ) : posts.map((post,i)=><PostCard key={post.id||i} post={post}/>)}
          </div>
        )}

        {/* ABOUT TAB */}
        {activeTab==="about"&&(
          <div style={{animation:"fadeUp 0.3s ease both"}}>
            {userData?.bio&&(
              <Card style={{marginBottom:16}}>
                <SL color={T.indigo}>About</SL>
                <p style={{fontSize:14,color:T.ink2,lineHeight:1.8,margin:"10px 0 0"}}>{userData.bio}</p>
              </Card>
            )}
            <Card style={{marginBottom:16}}>
              <SL color={T.blue}>Links</SL>
              <div style={{marginTop:12}}>
                {[{label:"Website",val:userData?.website,icon:"🌐",href:userData?.website},{label:"LinkedIn",val:userData?.linkedInUrl,icon:"💼",href:userData?.linkedInUrl},{label:"Company",val:userData?.company,icon:"🏢",href:null},{label:"Organization ID",val:userData?.organizationId,icon:"🧷",href:null}]
                  .filter(l=>l.val).map((l,i,arr)=>(
                  <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 0",borderBottom:i<arr.length-1?`1px solid ${T.border}`:"none"}}>
                    <span style={{fontSize:16}}>{l.icon}</span>
                    <span style={{fontSize:12,color:T.ink4,minWidth:96}}>{l.label}</span>
                    {l.href?<a href={l.href} target="_blank" rel="noreferrer" style={{fontSize:13,color:T.indigo,fontWeight:600,textDecoration:"none"}}>{l.val}</a>
                      :<span style={{fontSize:13,color:T.ink,fontWeight:600}}>{l.val}</span>}
                  </div>
                ))}
              </div>
            </Card>
            <Card style={{background:meta.verified?T.green2:T.cream2,border:`1.5px solid ${meta.verified?"rgba(26,122,74,0.2)":T.border}`}}>
              <SL color={meta.verified?T.green:T.ink4}>Verification Status</SL>
              <div style={{fontSize:13,color:meta.verified?T.green:T.ink3,lineHeight:1.7,marginTop:8}}>
                {meta.isInstitution ? (meta.verified ? "✦ Institution profile verified — organization/domain and identity trust signals are active." : "◎ Institution verification pending. Add domain, website, and organization trust proof.") : meta.mentorVerified ? "✦ Mentor verified — mentorship trust, review status, and guidance readiness approved." : meta.verified ? "✦ Identity/company verification complete — work identity and public trust signals reviewed." : "◎ Verification pending — complete work email, role/domain proof, and manual review."}
              </div>
            </Card>
          </div>
        )}

        {/* SKILLS TAB */}
        {activeTab==="skills"&&(
          <div style={{animation:"fadeUp 0.3s ease both"}}>
            {skills.length===0 ? (
              <div style={{textAlign:"center",padding:"60px 0",color:T.ink4}}>
                <div style={{fontSize:48,marginBottom:12}}>{meta.isInstitution?"🏢":"🎯"}</div>
                <div style={{fontSize:14}}>{meta.isInstitution?"No org signals yet. Add verification, resources, events, and trust metadata.":"No verified skills yet. Arena, assessments, or reviewed evidence can populate this section."}</div>
              </div>
            ) : (
              <Card style={{marginBottom:16}}>
                <SL color={T.indigo}>{meta.isInstitution?"Org Signals":"Verified Skills"}</SL>
                <div style={{marginTop:12}}>
                  {skills.map((s,i)=><SkillBar key={i} label={s.label||s.skill} value={s.value||s.score||s.percentage||0} color={SKILL_COLORS[i%SKILL_COLORS.length]}/>)}
                </div>
              </Card>
            )}
            {showElo&&(
              <Card style={{background:T.indigo3,border:`1.5px solid rgba(61,78,172,0.15)`}}>
                <SL color={T.indigo}>Arena / ELO Signals</SL>
                <div style={{fontSize:13,color:T.ink3,lineHeight:1.7,marginTop:8}}>
                  {meta.profileTrack==="org" ? `Optional proof-of-expertise signals. Arena completions: ${arenaCompleted}, ELO: ${eloRating}.` : `Arena-linked proof signals. Completions: ${arenaCompleted}, ELO: ${eloRating}.`}
                </div>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  )
}