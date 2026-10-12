package com.smarthire.tenant.interview.service;
import com.smarthire.tenant.interview.dto.HumanInterviewModels.InterviewView;
import java.time.*;
import com.smarthire.multitenancy.context.TenantContext;
import java.time.format.DateTimeFormatter;
import java.nio.charset.StandardCharsets;
import java.util.List;
public final class HumanInterviewCalendar {
    private HumanInterviewCalendar() {}
    public static String export(List<InterviewView> rows) {
        var body=new StringBuilder("BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//SmartHire//Human Interview//EN\r\nCALSCALE:GREGORIAN\r\n");
        for (var r:rows) {
            if (r.status().equals("DRAFT")) continue;
            line(body,"BEGIN:VEVENT"); line(body,"UID:human-"+java.util.Objects.toString(TenantContext.getCurrentTenant(),"local")+"-"+r.id()+"@smarthire");
            line(body,"DTSTAMP:"+stamp(Instant.now())); line(body,"DTSTART:"+stamp(r.start())); line(body,"DTEND:"+stamp(r.end()));
            line(body,"SUMMARY:"+escape(r.candidateName()+" - "+r.jobTitle()));
            line(body,"LOCATION:"+escape(r.mode().equals("ONLINE")?r.meetingUrl():r.location()));
            line(body,"DESCRIPTION:"+escape(r.configuration().notes()));
            line(body,"STATUS:"+(r.status().equals("CANCELLED")?"CANCELLED":"CONFIRMED")); line(body,"END:VEVENT");
        } return body.append("END:VCALENDAR\r\n").toString();
    }
    private static String stamp(Instant i) { return DateTimeFormatter.ofPattern("yyyyMMdd'T'HHmmss'Z'").withZone(ZoneOffset.UTC).format(i); }
    private static String escape(String s) { return s==null?"":s.replace("\\","\\\\").replace("\r","").replace("\n","\\n").replace(",","\\,").replace(";","\\;"); }
    private static void line(StringBuilder out,String text) {
        int width=0;
        for (int offset=0;offset<text.length();) {
            int cp=text.codePointAt(offset); String value=new String(Character.toChars(cp)); int bytes=value.getBytes(StandardCharsets.UTF_8).length;
            if (width+bytes>75) { out.append("\r\n ");width=1; }
            out.append(value);width+=bytes;offset+=Character.charCount(cp);
        } out.append("\r\n");
    }
}
