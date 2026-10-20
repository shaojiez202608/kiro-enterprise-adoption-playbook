#!/usr/bin/env bash
# Read-only residue check. This project does not deploy AWS resources; the check confirms that
# nothing named with the project prefix or carrying the project tag exists.
# Exit codes: 0 no residue; 1 residue found; 2 AWS CLI or credentials unavailable.
# Output never contains the account ID: every 12-digit number is replaced with 111122223333.
set -uo pipefail

PREFIX="${PROJECT_PREFIX:-proto-kiro-}"
TAG_KEY="${PROJECT_TAG_KEY:-Project}"
TAG_VALUE="${PROJECT_TAG_VALUE:-kiro-enterprise-playbook}"
# Regions where Kiro profiles can exist plus the CLI default region (see docs/architecture.md F-39).
REGIONS="${REGIONS:-us-east-1 eu-central-1 $(aws configure get region 2>/dev/null || true)}"

mask() { sed -E 's/[0-9]{12}/111122223333/g'; }
found=0
report() { echo "RESIDUE $*" | mask; found=$((found + 1)); }

if ! command -v aws >/dev/null 2>&1; then echo "aws CLI not found"; exit 2; fi
if ! aws sts get-caller-identity >/dev/null 2>&1; then echo "AWS credentials not available"; exit 2; fi
echo "Credentials OK (account ID not shown). Prefix: ${PREFIX}  Tag: ${TAG_KEY}=${TAG_VALUE}"

for region in $(echo "$REGIONS" | tr ' ' '\n' | sort -u); do
  [ -z "$region" ] && continue
  echo "== ${region}"
  stacks=$(aws cloudformation list-stacks --region "$region" \
    --query "StackSummaries[?StackStatus!='DELETE_COMPLETE' && starts_with(StackName, '${PREFIX}')].StackName" --output text 2>&1) \
    || { echo "WARN cloudformation list-stacks failed in ${region}" | mask; stacks=""; }
  for s in $stacks; do [ "$s" != "None" ] && report "stack ${region} ${s}"; done

  arns=$(aws resourcegroupstaggingapi get-resources --region "$region" \
    --tag-filters "Key=${TAG_KEY},Values=${TAG_VALUE}" --query 'ResourceTagMappingList[].ResourceARN' --output text 2>&1) \
    || { echo "WARN tagging API failed in ${region}" | mask; arns=""; }
  # The tag index can lag behind deletions: list every hit so it can be confirmed one by one.
  for a in $arns; do [ "$a" != "None" ] && report "tagged ${region} ${a} (confirm the resource still exists)"; done

  logs=$(aws logs describe-log-groups --region "$region" --log-group-name-prefix "/${PREFIX}" \
    --query 'logGroups[].logGroupName' --output text 2>/dev/null || true)
  for l in $logs; do [ "$l" != "None" ] && report "log-group ${region} ${l}"; done

  params=$(aws ssm describe-parameters --region "$region" \
    --parameter-filters "Key=Name,Option=BeginsWith,Values=/${PREFIX}" --query 'Parameters[].Name' --output text 2>/dev/null || true)
  for p in $params; do [ "$p" != "None" ] && report "ssm-parameter ${region} ${p}"; done
done

echo "== global"
buckets=$(aws s3api list-buckets --query "Buckets[?starts_with(Name, '${PREFIX}')].Name" --output text 2>/dev/null || true)
for b in $buckets; do [ "$b" != "None" ] && report "s3-bucket ${b}"; done
roles=$(aws iam list-roles --query "Roles[?starts_with(RoleName, '${PREFIX}')].RoleName" --output text 2>/dev/null || true)
for r in $roles; do [ "$r" != "None" ] && report "iam-role ${r}"; done

if [ "$found" -eq 0 ]; then
  echo "Result: no residue found."
  exit 0
fi
echo "Result: residue found (${found} item(s)), see RESIDUE lines above."
exit 1
